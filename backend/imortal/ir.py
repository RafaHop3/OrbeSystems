import json
from typing import Dict, Any, List, Tuple

# Definições de Limites de Hardware por Target
TARGET_LIMITS = {
    "atmega328p": {
        "pins": list(range(0, 20)),  # 0-13 digitais, 14-19 analógicos (A0-A5)
        "analog_pins": list(range(14, 20)),
        "pwm_pins": [3, 5, 6, 9, 10, 11],
        "max_delay_ms": 3600000, # Máximo de 1 hora de delay para evitar travar o watchdog
        "ram_bytes": 2048
    }
}

VALID_OPS = {
    "pin_mode", "digital_write", "digital_read", "analog_read", 
    "analog_write", "delay_ms", "assign", "if", "while", "serial_print"
}

def validate_ir(ir: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Valida rigorosamente a estrutura da Representação Intermediária (IR) recebida.
    Retorna (True, []) se válido, ou (False, [lista_de_erros]) se inválido.
    """
    errors = []
    
    # 1. Campos obrigatórios do Top-Level
    required_fields = ["project", "target", "clock_hz", "declarations", "setup", "loop"]
    for field in required_fields:
        if field not in ir:
            errors.append(f"Campo top-level obrigatório ausente: {field}")
            
    if errors:
        return False, errors
        
    target = ir["target"].lower()
    if target not in TARGET_LIMITS:
        errors.append(f"Target '{target}' não suportado. Targets disponíveis: {list(TARGET_LIMITS.keys())}")
        return False, errors
        
    limits = TARGET_LIMITS[target]
    
    # Auxiliar para validar variáveis declaradas
    declared_vars = {}
    
    # 2. Validar Declarações
    declarations = ir.get("declarations", [])
    if not isinstance(declarations, list):
        errors.append("O campo 'declarations' deve ser uma lista.")
    else:
        for idx, decl in enumerate(declarations):
            if not isinstance(decl, dict):
                errors.append(f"Declaração no índice {idx} inválida: deve ser um objeto JSON.")
                continue
            if "name" not in decl or "type" not in decl:
                errors.append(f"Declaração no índice {idx} sem 'name' ou 'type'.")
                continue
                
            name = decl["name"]
            decl_type = decl["type"]
            
            if not name.isidentifier():
                errors.append(f"Nome de variável inválido no índice {idx}: '{name}'")
                
            if decl_type == "const_int":
                if "value" not in decl:
                    errors.append(f"Constante '{name}' precisa de um campo 'value'.")
                declared_vars[name] = {"type": "const_int", "value": decl.get("value")}
            elif decl_type in ("int", "bool"):
                initial_val = decl.get("initial_value", 0)
                declared_vars[name] = {
                    "type": decl_type, 
                    "initial_value": initial_val,
                    "min_val": decl.get("min_val", -32768),
                    "max_val": decl.get("max_val", 32767)
                }
            elif decl_type == "array":
                size = decl.get("size")
                if not isinstance(size, int) or size <= 0:
                    errors.append(f"Array '{name}' precisa de um 'size' inteiro positivo.")
                declared_vars[name] = {
                    "type": "array",
                    "size": size,
                    "min_val": decl.get("min_val", -32768),
                    "max_val": decl.get("max_val", 32767)
                }
            else:
                errors.append(f"Tipo desconhecido '{decl_type}' na declaração de '{name}'.")

    # Função interna para validar expressões (simples)
    def validate_expr(expr: Any, context: str) -> None:
        if isinstance(expr, int):
            return
        if isinstance(expr, str):
            if expr in ("HIGH", "LOW", "INPUT", "OUTPUT", "INPUT_PULLUP"):
                return
            if expr in declared_vars:
                return
            errors.append(f"Identificador ou constante não declarada '{expr}' usada em {context}.")
            return
        if isinstance(expr, dict):
            if "op" in expr and "left" in expr and "right" in expr:
                validate_expr(expr["left"], f"{context} -> left")
                validate_expr(expr["right"], f"{context} -> right")
                if expr["op"] not in ("+", "-", "*", "/", "==", "!=", "<", ">", "<=", ">="):
                    errors.append(f"Operador aritmético/lógico inválido '{expr['op']}' em {context}.")
            else:
                errors.append(f"Expressão malformada em {context}: deve conter 'op', 'left' e 'right'.")
            return
        errors.append(f"Tipo de expressão inválida '{type(expr)}' em {context}.")

    # Função interna para validar uma instrução individual
    def validate_instruction(instr: Dict[str, Any], block_name: str) -> None:
        if not isinstance(instr, dict):
            errors.append(f"Instrução inválida no bloco {block_name}: deve ser um objeto JSON.")
            return
        op = instr.get("op")
        if not op or op not in VALID_OPS:
            errors.append(f"Operação desconhecida ou ausente '{op}' no bloco {block_name}.")
            return
            
        if op == "pin_mode":
            pin = instr.get("pin")
            mode = instr.get("mode")
            if mode not in ("INPUT", "OUTPUT", "INPUT_PULLUP"):
                errors.append(f"Modo de pino inválido '{mode}' em {block_name}.")
            validate_expr(pin, f"{block_name} -> pin_mode")
            
        elif op == "digital_write":
            pin = instr.get("pin")
            val = instr.get("value")
            validate_expr(pin, f"{block_name} -> digital_write (pin)")
            validate_expr(val, f"{block_name} -> digital_write (value)")
            
        elif op == "analog_write":
            pin = instr.get("pin")
            val = instr.get("value")
            validate_expr(pin, f"{block_name} -> analog_write (pin)")
            validate_expr(val, f"{block_name} -> analog_write (value)")
            
        elif op == "digital_read":
            pin = instr.get("pin")
            var = instr.get("variable")
            if var not in declared_vars or declared_vars[var]["type"] not in ("int", "bool"):
                errors.append(f"Variável de leitura digital inválida ou não declarada '{var}' em {block_name}.")
            validate_expr(pin, f"{block_name} -> digital_read")
            
        elif op == "analog_read":
            pin = instr.get("pin")
            var = instr.get("variable")
            if var not in declared_vars or declared_vars[var]["type"] != "int":
                errors.append(f"Variável de leitura analógica inválida ou não declarada '{var}' em {block_name}.")
            validate_expr(pin, f"{block_name} -> analog_read")
            
        elif op == "delay_ms":
            val = instr.get("value")
            validate_expr(val, f"{block_name} -> delay_ms")
            
        elif op == "assign":
            var = instr.get("variable")
            val = instr.get("value")
            idx = instr.get("index") # Opcional, para arrays
            
            if var not in declared_vars:
                errors.append(f"Atribuição a variável não declarada '{var}' em {block_name}.")
            else:
                vtype = declared_vars[var]["type"]
                if vtype == "const_int":
                    errors.append(f"Impossível reatribuir valor à constante '{var}' em {block_name}.")
                elif vtype == "array" and idx is None:
                    errors.append(f"Tentativa de atribuição direta a array '{var}' sem indicar índice em {block_name}.")
            
            if idx is not None:
                validate_expr(idx, f"{block_name} -> assign (index)")
            validate_expr(val, f"{block_name} -> assign (value)")
            
        elif op == "serial_print":
            val = instr.get("value")
            validate_expr(val, f"{block_name} -> serial_print")
            
        elif op == "if":
            cond = instr.get("condition")
            then_branch = instr.get("then", [])
            else_branch = instr.get("else", [])
            
            validate_expr(cond, f"{block_name} -> if condition")
            if not isinstance(then_branch, list):
                errors.append(f"O ramo 'then' do 'if' deve ser uma lista de instruções em {block_name}.")
            else:
                for t_instr in then_branch:
                    validate_instruction(t_instr, f"{block_name} -> if -> then")
                    
            if not isinstance(else_branch, list):
                errors.append(f"O ramo 'else' do 'if' deve ser uma lista de instruções em {block_name}.")
            else:
                for e_instr in else_branch:
                    validate_instruction(e_instr, f"{block_name} -> if -> else")
                    
        elif op == "while":
            cond = instr.get("condition")
            body = instr.get("body", [])
            
            validate_expr(cond, f"{block_name} -> while condition")
            if not isinstance(body, list):
                errors.append(f"O corpo do 'while' deve ser uma lista de instruções em {block_name}.")
            else:
                for b_instr in body:
                    validate_instruction(b_instr, f"{block_name} -> while -> body")

    # 3. Validar Bloco Setup
    setup_block = ir.get("setup", [])
    if not isinstance(setup_block, list):
        errors.append("O bloco 'setup' deve ser uma lista de instruções.")
    else:
        for idx, instr in enumerate(setup_block):
            validate_instruction(instr, f"setup[{idx}]")
            
    # 4. Validar Bloco Loop
    loop_block = ir.get("loop", [])
    if not isinstance(loop_block, list):
        errors.append("O bloco 'loop' deve ser uma lista de instruções.")
    else:
        for idx, instr in enumerate(loop_block):
            validate_instruction(instr, f"loop[{idx}]")
            
    # 5. Validar Assertions Opcionais
    assertions = ir.get("assertions", [])
    if not isinstance(assertions, list):
        errors.append("O bloco 'assertions' deve ser uma lista.")
    else:
        for idx, ass in enumerate(assertions):
            atype = ass.get("type")
            if atype == "bounds":
                var = ass.get("variable")
                if var not in declared_vars:
                    errors.append(f"Assertion de limites refere-se a variável não declarada '{var}'.")
            elif atype == "assert":
                cond = ass.get("condition")
                validate_expr(cond, f"assertion[{idx}]")
            else:
                errors.append(f"Assertion de tipo desconhecido '{atype}' no índice {idx}.")

    return len(errors) == 0, errors


def get_default_ir() -> Dict[str, Any]:
    """Retorna uma IR de exemplo (Blink com Entrada de Sensor e Proteções)"""
    return {
        "project": "BlinkSeguro",
        "target": "atmega328p",
        "clock_hz": 16000000,
        "declarations": [
            {"name": "LED_PIN", "type": "const_int", "value": 13},
            {"name": "SENSOR_PIN", "type": "const_int", "value": 14}, # Pino A0 mapeado formalmente
            {"name": "leitura", "type": "int", "initial_value": 0, "min_val": 0, "max_val": 1023},
            {"name": "intervalo", "type": "int", "initial_value": 1000, "min_val": 100, "max_val": 5000}
        ],
        "setup": [
            {"op": "pin_mode", "pin": "LED_PIN", "mode": "OUTPUT"},
            {"op": "pin_mode", "pin": "SENSOR_PIN", "mode": "INPUT"}
        ],
        "loop": [
            {"op": "analog_read", "pin": "SENSOR_PIN", "variable": "leitura"},
            {
                "op": "if",
                "condition": {
                    "op": ">",
                    "left": "leitura",
                    "right": 500
                },
                "then": [
                    {"op": "assign", "variable": "intervalo", "value": 200}
                ],
                "else": [
                    {"op": "assign", "variable": "intervalo", "value": 1000}
                ]
            },
            {"op": "digital_write", "pin": "LED_PIN", "value": "HIGH"},
            {"op": "delay_ms", "value": "intervalo"},
            {"op": "digital_write", "pin": "LED_PIN", "value": "LOW"},
            {"op": "delay_ms", "value": "intervalo"}
        ],
        "assertions": [
            {"type": "bounds", "variable": "leitura", "min": 0, "max": 1023},
            {"type": "bounds", "variable": "intervalo", "min": 100, "max": 5000}
        ]
    }
