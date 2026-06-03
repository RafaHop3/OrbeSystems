import logging
from typing import Dict, Any, List, Tuple
from z3 import Solver, Int, Bool, Real, And, Or, Not, Implies, If, sat, unsat
from imortal.ir import TARGET_LIMITS
from imortal.config import Z3_TIMEOUT_MS

logger = logging.getLogger(__name__)

class FormalVerifier:
    def __init__(self, ir: Dict[str, Any]):
        self.ir = ir
        self.target = ir.get("target", "atmega328p").lower()
        self.limits = TARGET_LIMITS.get(self.target, TARGET_LIMITS["atmega328p"])
        
        self.solver = Solver()
        # Aplica timeout global para evitar que propriedades complexas travem o pipeline
        self.solver.set("timeout", Z3_TIMEOUT_MS)
        self.variables: Dict[str, List[Any]] = {}  # Mapeia nome da var para lista de suas versões SSA
        self.current_ssa: Dict[str, int] = {}      # Mapeia nome para o índice SSA atual
        
        self.safety_assertions: List[Tuple[Any, str]] = [] # Lista de (ExpressãoZ3, MensagemDeErro)
        self.init_variables()

    def get_var(self, name: str) -> Any:
        """Retorna a versão SSA atual da variável."""
        if name not in self.variables:
            # Variável não declarada localmente mas mapeada
            if name == "HIGH":
                return 1
            elif name == "LOW":
                return 0
            elif name in ("INPUT", "OUTPUT", "INPUT_PULLUP"):
                return 1
            # Se não declarada, cria como Int padrão para evitar quebras
            self.variables[name] = [Int(f"{name}_0")]
            self.current_ssa[name] = 0
        return self.variables[name][self.current_ssa[name]]

    def fresh_var(self, name: str) -> Any:
        """Cria e retorna uma nova versão SSA para a variável."""
        if name not in self.variables:
            self.variables[name] = [Int(f"{name}_0")]
            self.current_ssa[name] = 0
            return self.variables[name][0]
        
        next_ver = self.current_ssa[name] + 1
        self.current_ssa[name] = next_ver
        
        # Cria Z3 variable
        new_z3_var = Int(f"{name}_{next_ver}")
        self.variables[name].append(new_z3_var)
        return new_z3_var

    def init_variables(self):
        """Inicializa as variáveis baseando-se nas declarações do IR."""
        for decl in self.ir.get("declarations", []):
            name = decl["name"]
            dtype = decl["type"]
            
            if dtype == "const_int":
                val = decl["value"]
                z3_var = Int(f"{name}_0")
                self.variables[name] = [z3_var]
                self.current_ssa[name] = 0
                self.solver.add(z3_var == val)
                
            elif dtype in ("int", "bool"):
                initial_val = decl.get("initial_value", 0)
                min_val = decl.get("min_val", -32768)
                max_val = decl.get("max_val", 32767)
                
                z3_var = Int(f"{name}_0")
                self.variables[name] = [z3_var]
                self.current_ssa[name] = 0
                
                # Assert da inicialização
                self.solver.add(z3_var == initial_val)
                # Adiciona restrições físicas de limites
                self.solver.add(z3_var >= min_val)
                self.solver.add(z3_var <= max_val)
                
            elif dtype == "array":
                size = decl["size"]
                # Para simplificar e manter a prova formal ultra veloz,
                # representamos o array como uma coleção de elementos Z3
                self.variables[name] = []
                for i in range(size):
                    arr_elem_name = f"{name}_arr_{i}"
                    elem_z3 = Int(f"{arr_elem_name}_0")
                    self.variables[arr_elem_name] = [elem_z3]
                    self.current_ssa[arr_elem_name] = 0
                    
                    # Limites físicos de valores para elementos de array
                    min_val = decl.get("min_val", -32768)
                    max_val = decl.get("max_val", 32767)
                    self.solver.add(elem_z3 >= min_val)
                    self.solver.add(elem_z3 <= max_val)

    def translate_expr(self, expr: Any) -> Any:
        """Traduz uma expressão do IR para termos equivalentes do Z3."""
        if isinstance(expr, int):
            return expr
            
        if isinstance(expr, str):
            if expr == "HIGH":
                return 1
            elif expr == "LOW":
                return 0
            elif expr in ("INPUT", "OUTPUT", "INPUT_PULLUP"):
                return 1
            return self.get_var(expr)
            
        if isinstance(expr, dict):
            op = expr.get("op")
            left_val = self.translate_expr(expr.get("left"))
            right_val = self.translate_expr(expr.get("right"))
            
            # Verificação de Divisão por Zero
            if op == "/":
                self.safety_assertions.append(
                    (right_val != 0, f"Possível divisão por zero detectada ao dividir {expr.get('left')} por {expr.get('right')}.")
                )
                return left_val / right_val
                
            if op == "+": return left_val + right_val
            if op == "-": return left_val - right_val
            if op == "*": return left_val * right_val
            if op == "==": return left_val == right_val
            if op == "!=": return left_val != right_val
            if op == "<": return left_val < right_val
            if op == ">": return left_val > right_val
            if op == "<=": return left_val <= right_val
            if op == ">=": return left_val >= right_val
            
        return 0

    def check_pin_validity(self, pin_expr: Any, op_context: str):
        """Adiciona asserção Z3 para garantir que o pino está dentro dos limites."""
        z3_pin = self.translate_expr(pin_expr)
        pins_list = self.limits["pins"]
        min_pin = min(pins_list)
        max_pin = max(pins_list)
        
        self.safety_assertions.append(
            (And(z3_pin >= min_pin, z3_pin <= max_pin), 
             f"Pino inválido {pin_expr} em '{op_context}'. Pinos válidos para {self.target} são de {min_pin} a {max_pin}.")
        )

    def process_instruction(self, instr: Dict[str, Any]):
        """Executa a análise simbólica passo a passo de uma instrução."""
        op = instr.get("op")
        
        if op == "pin_mode":
            self.check_pin_validity(instr.get("pin"), "Configuração de Modo de Pino")
            
        elif op in ("digital_write", "analog_write"):
            self.check_pin_validity(instr.get("pin"), f"Escrita em {op}")
            # Se for escrita analógica (PWM), verificar pinos compatíveis
            if op == "analog_write" and isinstance(instr.get("pin"), int):
                pin = instr.get("pin")
                if pin not in self.limits["pwm_pins"]:
                    self.safety_assertions.append(
                        (Bool(f"pwm_warn_{pin}") == False, f"Aviso formal: Escrita analógica no pino {pin} que não suporta PWM por hardware.")
                    )
            # Validar limites de escrita
            val = self.translate_expr(instr.get("value"))
            if op == "digital_write":
                self.safety_assertions.append(
                    (Or(val == 0, val == 1), f"Escrita digital com valor não-booleano: {instr.get('value')}")
                )
            else:
                self.safety_assertions.append(
                    (And(val >= 0, val <= 255), f"Escrita analógica (PWM) com valor fora dos limites (0-255): {instr.get('value')}")
                )
                
        elif op in ("digital_read", "analog_read"):
            self.check_pin_validity(instr.get("pin"), f"Leitura em {op}")
            var_name = instr.get("variable")
            # Leitura de pino injeta um valor simbólico irrestrito (dentro dos limites físicos da leitura)
            z3_var = self.fresh_var(var_name)
            if op == "digital_read":
                self.solver.add(Or(z3_var == 0, z3_var == 1))
            else: # Analog read é 10 bits no Uno (0 a 1023)
                self.solver.add(And(z3_var >= 0, z3_var <= 1023))
                
        elif op == "delay_ms":
            val_expr = instr.get("value")
            z3_delay = self.translate_expr(val_expr)
            self.safety_assertions.append(
                (And(z3_delay >= 0, z3_delay <= self.limits["max_delay_ms"]),
                 f"Delay ms perigoso: {val_expr}. Deve ser entre 0 e {self.limits['max_delay_ms']} ms para evitar watchdog lockup.")
            )
            
        elif op == "assign":
            var_name = instr.get("variable")
            val_expr = instr.get("value")
            idx_expr = instr.get("index")
            
            # Se for escrita em array
            if idx_expr is not None:
                # Obter declaração do array para saber o tamanho
                arr_decl = next((d for d in self.ir.get("declarations", []) if d["name"] == var_name), None)
                if arr_decl and arr_decl["type"] == "array":
                    size = arr_decl["size"]
                    z3_idx = self.translate_expr(idx_expr)
                    
                    # 1. Provar ausência de Buffer Overflow (Memory Bounds Check)
                    self.safety_assertions.append(
                        (And(z3_idx >= 0, z3_idx < size),
                         f"Memory Safety: Índice do array '{var_name}' [{idx_expr}] fora dos limites (0 a {size-1}). Possibilidade de Buffer Overflow!")
                    )
                    
                    # 2. Executar escrita simbólica em cada elemento indexado
                    # (Se o índice Z3 for i, então arr_elem_i recebe o novo valor, senão mantém o antigo)
                    z3_val = self.translate_expr(val_expr)
                    for i in range(size):
                        elem_name = f"{var_name}_arr_{i}"
                        old_elem_val = self.get_var(elem_name)
                        new_elem_var = self.fresh_var(elem_name)
                        
                        # Atribuição condicional lógica Z3
                        self.solver.add(new_elem_var == If(z3_idx == i, z3_val, old_elem_val))
            else:
                # Atribuição de variável escalar simples
                z3_val = self.translate_expr(val_expr)
                new_var = self.fresh_var(var_name)
                self.solver.add(new_var == z3_val)
                
        elif op == "if":
            cond_expr = instr.get("condition")
            z3_cond = self.translate_expr(cond_expr)
            
            then_branch = instr.get("then", [])
            else_branch = instr.get("else", [])
            
            # Salvar estado SSA antes do bloco
            pre_ssa = self.current_ssa.copy()
            
            # Processar Ramo THEN
            for t_instr in then_branch:
                self.process_instruction(t_instr)
            then_ssa = self.current_ssa.copy()
            
            # Resetar estado SSA para processar ramo ELSE
            self.current_ssa = pre_ssa.copy()
            for e_instr in else_branch:
                self.process_instruction(e_instr)
            else_ssa = self.current_ssa.copy()
            
            # Encontrar união de variáveis modificadas em ambos os ramos e fundir SSA
            modified_vars = set(then_ssa.keys()).union(else_ssa.keys())
            for var in modified_vars:
                # Se foi modificado, gera nova versão SSA fundida
                t_idx = then_ssa.get(var, pre_ssa.get(var, 0))
                e_idx = else_ssa.get(var, pre_ssa.get(var, 0))
                
                # Se não houver modificações diferentes, não precisa fundir
                if t_idx == e_idx:
                    self.current_ssa[var] = t_idx
                    continue
                    
                t_z3_var = self.variables[var][t_idx]
                e_z3_var = self.variables[var][e_idx]
                
                merged_z3_var = self.fresh_var(var)
                # Equação de fusão SSA: var_merged == If(cond, var_then, var_else)
                self.solver.add(merged_z3_var == If(z3_cond, t_z3_var, e_z3_var))
                
        elif op == "while":
            # Em modelagem formal padrão, laços são difíceis de provar de forma geral
            # sem invariantes. Para o MVP, fazemos Unrolling de Laço (Simulação Simbólica de 2 Iterações)
            # o que é extremamente eficaz para encontrar erros de bounds, travar do watchdog e pinos
            cond_expr = instr.get("condition")
            body = instr.get("body", [])
            
            for iteracao in range(2):
                z3_cond = self.translate_expr(cond_expr)
                
                # Salva estado para merge
                pre_body_ssa = self.current_ssa.copy()
                
                for b_instr in body:
                    self.process_instruction(b_instr)
                    
                # Fusão condicional da iteração do laço (se a condição for verdadeira, aplica o corpo, senão mantém)
                body_ssa = self.current_ssa.copy()
                modified_vars = set(body_ssa.keys()).union(pre_body_ssa.keys())
                for var in modified_vars:
                    b_idx = body_ssa.get(var, pre_body_ssa.get(var, 0))
                    pre_idx = pre_body_ssa.get(var, 0)
                    
                    if b_idx != pre_idx:
                        b_z3_var = self.variables[var][b_idx]
                        pre_z3_var = self.variables[var][pre_idx]
                        
                        merged_z3_var = self.fresh_var(var)
                        self.solver.add(merged_z3_var == If(z3_cond, b_z3_var, pre_z3_var))

    def verify(self) -> Tuple[bool, List[str]]:
        """
        Executa a prova lógica. Retorna (True, []) se aprovado matematicamente,
        ou (False, [lista_de_contra_exemplos]) se houver alguma brecha de segurança.
        """
        # 1. Processar Setup
        for instr in self.ir.get("setup", []):
            self.process_instruction(instr)
            
        # 2. Processar Loop
        for instr in self.ir.get("loop", []):
            self.process_instruction(instr)
            
        # 3. Processar Assertions Explícitas do Usuário
        for ass in self.ir.get("assertions", []):
            atype = ass.get("type")
            if atype == "bounds":
                var_name = ass.get("variable")
                min_val = ass.get("min")
                max_val = ass.get("max")
                
                z3_var = self.get_var(var_name)
                self.safety_assertions.append(
                    (And(z3_var >= min_val, z3_var <= max_val),
                     f"Falha na Assertion de Limites: '{var_name}' deve estar rigorosamente entre {min_val} e {max_val}.")
                )
            elif atype == "assert":
                cond = ass.get("condition")
                z3_cond = self.translate_expr(cond)
                self.safety_assertions.append(
                    (z3_cond, f"Falha na Asserção Lógica Formal: {cond}")
                )

        # 4. Provar cada assert de segurança
        failures = []
        for prop, error_msg in self.safety_assertions:
            # Para provar que PROP é SEMPRE verdade, checamos se NOT(PROP) é SAT.
            self.solver.push()
            self.solver.add(Not(prop))
            
            result = self.solver.check()
            if result == sat:
                # Há um contra-exemplo! A propriedade falha!
                model = self.solver.model()
                diag = []
                for d in model.decls():
                    val = model[d]
                    diag.append(f"{d.name()}={val}")
                
                diag_str = ", ".join(diag[:5])  # Limita para não inundar
                failures.append(f"{error_msg} (Caso de Falha: {diag_str})")
                logger.debug("Z3 falhou em '%s' | Contra-exemplo: %s", error_msg[:80], diag_str)

            elif str(result) == "unknown":
                # Timeout ou indecidível — reporta como aviso, não bloqueia a compilação
                logger.warning(
                    "Z3 timeout/indecidível para a propriedade: '%s'. "
                    "Aumente Z3_TIMEOUT_MS se necessário.",
                    error_msg[:120],
                )
                failures.append(
                    f"[TIMEOUT Z3] Não foi possível provar dentro de {Z3_TIMEOUT_MS}ms: {error_msg}"
                )
                
            self.solver.pop()
            
        return len(failures) == 0, failures
