import random
import logging
from typing import Dict, Any, List, Tuple
from imortal.ir import TARGET_LIMITS

logger = logging.getLogger(__name__)

class RuntimeException(Exception):
    pass

class StateEmulator:
    """
    Emulador leve de estado de memória e hardware para a IR do Projeto IMORTAL.
    Executa instruções concretamente e mantém estados lógicos e pinos virtuais.
    """
    def __init__(self, ir: Dict[str, Any]):
        self.ir = ir
        self.target = ir.get("target", "atmega328p").lower()
        self.limits = TARGET_LIMITS.get(self.target, TARGET_LIMITS["atmega328p"])
        
        self.variables: Dict[str, Any] = {}
        self.arrays: Dict[str, List[int]] = {}
        self.pins_mode: Dict[int, str] = {}    # pino -> mode (INPUT, OUTPUT, etc)
        self.pins_val: Dict[int, int] = {}     # pino -> valor (HIGH=1, LOW=0, analog=0..1023)
        self.serial_buffer: List[str] = []
        self.virtual_time_ms: int = 0
        self.cycles: int = 0
        self.max_cycles: int = 5000 # Limite de salvaguarda de CPU para evitar loop infinito
        
        self.init_hardware()

    def init_hardware(self):
        """Inicializa pinos e variáveis do IR."""
        for p in self.limits["pins"]:
            self.pins_mode[p] = "INPUT" # Padrão do microcontrolador é entrada de alta impedância
            self.pins_val[p] = 0
            
        for decl in self.ir.get("declarations", []):
            name = decl["name"]
            dtype = decl["type"]
            if dtype == "const_int":
                self.variables[name] = decl["value"]
            elif dtype in ("int", "bool"):
                self.variables[name] = decl.get("initial_value", 0)
            elif dtype == "array":
                size = decl["size"]
                initial = decl.get("initial_value", 0)
                if isinstance(initial, list):
                    # Se for lista, ajusta ou padroniza
                    self.arrays[name] = (initial + [0]*size)[:size]
                else:
                    self.arrays[name] = [0] * size

    def eval_expr(self, expr: Any) -> Any:
        """Avalia concretamente uma expressão aritmética ou lógica da IR."""
        if isinstance(expr, int):
            return expr
        if isinstance(expr, str):
            if expr == "HIGH": return 1
            if expr == "LOW": return 0
            if expr in ("INPUT", "OUTPUT", "INPUT_PULLUP"): return expr
            
            if expr in self.variables:
                return self.variables[expr]
            raise RuntimeException(f"Identificador não declarado ou desconhecido em expressão: '{expr}'")
            
        if isinstance(expr, dict):
            op = expr.get("op")
            left = self.eval_expr(expr.get("left"))
            right = self.eval_expr(expr.get("right"))
            
            if op == "+": return left + right
            elif op == "-": return left - right
            elif op == "*": return left * right
            elif op in ("/", "%"):
                if right == 0:
                    raise RuntimeException(f"Divisão/módulo por zero em tempo de execução: {left} {op} {right}")
                if op == "/":
                    return left // right # Divisão inteira bare-metal
                else:
                    return left % right
            elif op == "==": return 1 if left == right else 0
            elif op == "!=": return 1 if left != right else 0
            elif op == "<": return 1 if left < right else 0
            elif op == ">": return 1 if left > right else 0
            elif op == "<=": return 1 if left <= right else 0
            elif op == ">=": return 1 if left >= right else 0
            else:
                raise RuntimeException(f"Operador aritmético desconhecido: '{op}'")
                
        raise RuntimeException(f"Tipo de expressão inválida: {type(expr)}")

    def run_instruction(self, instr: Dict[str, Any]):
        """Executa uma única instrução da IR."""
        self.cycles += 1
        if self.cycles > self.max_cycles:
            raise RuntimeException(f"Estouro de salvaguarda de CPU: Possível loop infinito (> {self.max_cycles} instruções).")
            
        op = instr.get("op")
        
        if op == "pin_mode":
            pin = self.eval_expr(instr.get("pin"))
            mode = instr.get("mode")
            if pin not in self.limits["pins"]:
                raise RuntimeException(f"Erro de hardware: Pino {pin} fora dos limites físicos do {self.target}.")
            self.pins_mode[pin] = mode
            
        elif op == "digital_write":
            pin = self.eval_expr(instr.get("pin"))
            val = self.eval_expr(instr.get("value"))
            if pin not in self.limits["pins"]:
                raise RuntimeException(f"Erro de hardware: Escrita digital no pino inválido {pin}.")
            if self.pins_mode[pin] != "OUTPUT":
                # Muitos microcontroladores permitem escrever em pinos de entrada para ativar pull-up,
                # mas em sistemas de alta segurança isso é considerado má prática ou perigoso.
                pass
            self.pins_val[pin] = 1 if val != 0 else 0
            
        elif op == "analog_write":
            pin = self.eval_expr(instr.get("pin"))
            val = self.eval_expr(instr.get("value"))
            if pin not in self.limits["pins"]:
                raise RuntimeException(f"Erro de hardware: Escrita analógica no pino inválido {pin}.")
            if pin not in self.limits["pwm_pins"]:
                # Registra mas avisa
                pass
            if val < 0 or val > 255:
                raise RuntimeException(f"Valor analógico PWM fora dos limites (0-255): {val}")
            self.pins_val[pin] = val
            
        elif op == "digital_read":
            pin = self.eval_expr(instr.get("pin"))
            var = instr.get("variable")
            if pin not in self.limits["pins"]:
                raise RuntimeException(f"Erro de hardware: Leitura digital do pino inválido {pin}.")
            # Se for entrada real, o valor vem do estado do pino (que pode ser modificado pelo fuzzer)
            self.variables[var] = 1 if self.pins_val[pin] != 0 else 0
            
        elif op == "analog_read":
            pin = self.eval_expr(instr.get("pin"))
            var = instr.get("variable")
            if pin not in self.limits["pins"]:
                raise RuntimeException(f"Erro de hardware: Leitura analógica do pino inválido {pin}.")
            # Retorna o valor atual do pino (fuzzed ou estático)
            self.variables[var] = self.pins_val[pin]
            
        elif op == "delay_ms":
            val = self.eval_expr(instr.get("value"))
            if val < 0:
                raise RuntimeException(f"Tempo de delay negativo inválido: {val} ms.")
            if val > self.limits["max_delay_ms"]:
                raise RuntimeException(f"Aviso de Segurança: Delay excessivo de {val} ms ultrapassa a proteção de watchdog.")
            self.virtual_time_ms += val
            
        elif op == "assign":
            var = instr.get("variable")
            val = self.eval_expr(instr.get("value"))
            idx_expr = instr.get("index")
            
            if idx_expr is not None:
                idx = self.eval_expr(idx_expr)
                if var not in self.arrays:
                    raise RuntimeException(f"Variavel '{var}' usada como array mas não declarada como tal.")
                arr = self.arrays[var]
                if idx < 0 or idx >= len(arr):
                    raise RuntimeException(f"Memory Safety Violation: Acesso ao array '{var}' no índice {idx} fora dos limites (0 a {len(arr)-1}). Buffer Overflow Detectado!")
                arr[idx] = val
            else:
                if var not in self.variables:
                    raise RuntimeException(f"Variável não declarada: '{var}'")
                
                # Verifica limites concretos na sandbox para evitar overflows silenciosos
                decl = next((d for d in self.ir.get("declarations", []) if d["name"] == var), None)
                if decl:
                    min_val = decl.get("min_val", -32768)
                    max_val = decl.get("max_val", 32767)
                    if val < min_val or val > max_val:
                        raise RuntimeException(f"Integer Overflow/Underflow em tempo de execução: Atribuição à variável '{var}' com valor {val} fora dos limites ({min_val} a {max_val}).")
                
                self.variables[var] = val
                
        elif op == "serial_print":
            val = self.eval_expr(instr.get("value"))
            self.serial_buffer.append(str(val))
            
        elif op == "if":
            cond = self.eval_expr(instr.get("condition"))
            if cond != 0:
                for t_instr in instr.get("then", []):
                    self.run_instruction(t_instr)
            else:
                for e_instr in instr.get("else", []):
                    self.run_instruction(e_instr)
                    
        elif op == "while":
            while True:
                # Verifica o limite de ciclos ANTES de cada iteração do laço
                # para garantir detecção mesmo quando o corpo do while não chama run_instruction.
                if self.cycles > self.max_cycles:
                    raise RuntimeException(
                        f"Estouro de salvaguarda de CPU em 'while': possível loop infinito "
                        f"(> {self.max_cycles} ciclos totais)."
                    )
                self.cycles += 1  # Conta a avaliação da condição como um ciclo
                cond = self.eval_expr(instr.get("condition"))
                if cond == 0:
                    break
                for b_instr in instr.get("body", []):
                    self.run_instruction(b_instr)

    def run_cycle(self, iterations: int = 1):
        """Roda o bloco Setup uma vez e o bloco Loop 'iterations' vezes."""
        # 1. Roda Setup
        for instr in self.ir.get("setup", []):
            self.run_instruction(instr)
            
        # 2. Roda Loop
        for i in range(iterations):
            for instr in self.ir.get("loop", []):
                self.run_instruction(instr)


class SandboxFuzzer:
    """
    Camada de Testes de Estresse (Fuzzing) com dados randômicos.
    Identifica vulnerabilidades simulando múltiplos cenários de hardware.
    """
    def __init__(self, ir: Dict[str, Any]):
        self.ir = ir
        self.target = ir.get("target", "atmega328p").lower()
        self.limits = TARGET_LIMITS.get(self.target, TARGET_LIMITS["atmega328p"])
        
    def fuzz(self, num_runs: int = 100, loop_iterations: int = 10) -> Tuple[bool, List[str]]:
        """
        Executa múltiplos ciclos de testes gerando valores randômicos para entradas
        (pinos configurados como INPUT, sensores, leituras analógicas).
        Retorna (True, []) se passou em todo fuzzing, ou (False, [erros]) se encontrou crash.
        """
        failures = []
        
        # Encontra se há leituras que dependem de pinos para injetarmos ruído fuzzed
        input_pins = set()
        
        # Faz uma varredura para descobrir quais pinos são usados em leituras
        for block in ("setup", "loop"):
            for instr in self.ir.get(block, []):
                # Descobre dinamicamente pinos lidos
                if instr.get("op") in ("digital_read", "analog_read"):
                    pin_expr = instr.get("pin")
                    if isinstance(pin_expr, int):
                        input_pins.add(pin_expr)
                    elif isinstance(pin_expr, str):
                        # Tenta resolver de consts declaradas
                        for decl in self.ir.get("declarations", []):
                            if decl["name"] == pin_expr and decl["type"] == "const_int":
                                input_pins.add(decl["value"])
                                
        for run in range(num_runs):
            emulator = StateEmulator(self.ir)
            
            # Injeta entradas randômicas antes/durante a execução
            for pin in input_pins:
                if pin in self.limits["analog_pins"]:
                    # Analógico (0 a 1023)
                    emulator.pins_val[pin] = random.randint(0, 1023)
                else:
                    # Digital (0 ou 1)
                    emulator.pins_val[pin] = random.choice([0, 1])
                    
            try:
                # Executa o ciclo de setup e loop
                # Durante a execução, também injetamos flutuações randômicas dinâmicas para simular ruído físico!
                for instr in self.ir.get("setup", []):
                    emulator.run_instruction(instr)
                    
                for step in range(loop_iterations):
                    # Flutuação física nos pinos de entrada a cada iteração de loop
                    for pin in input_pins:
                        if pin in self.limits["analog_pins"]:
                            emulator.pins_val[pin] = random.randint(0, 1023)
                        else:
                            emulator.pins_val[pin] = random.choice([0, 1])
                            
                    for instr in self.ir.get("loop", []):
                        emulator.run_instruction(instr)
                        
                # Verifica restrições pós-execução das assertions locais
                for ass in self.ir.get("assertions", []):
                    atype = ass.get("type")
                    if atype == "bounds":
                        var = ass.get("variable")
                        min_v = ass.get("min")
                        max_v = ass.get("max")
                        if var in emulator.variables:
                            val = emulator.variables[var]
                            if val < min_v or val > max_v:
                                raise RuntimeException(f"Falha de Asserção do Fuzzer: Variável '{var}' com valor {val} violou limites ({min_v} a {max_v}).")
                                
            except RuntimeException as e:
                # Captura falha e monta trace
                failures.append(f"Fuzz Run #{run+1} Falhou: {str(e)}")
                if len(failures) >= 5: # Reporta no máximo 5 falhas significativas para poupar contexto
                    break
            except Exception as e:
                failures.append(f"Fuzz Run #{run+1} Crash de Executável: {type(e).__name__}: {str(e)}")
                break
                
        return len(failures) == 0, failures
