from typing import Dict, Any, List

class IRVisualizer:
    """
    Motor de Engenharia Reversa para a IR.
    Traduz a estrutura JSON abstrata em pseudocódigo legível de alto contraste e
    em uma estrutura de nós gráficos (flowchart) para renderização no dashboard.
    """
    def __init__(self, ir: Dict[str, Any]):
        self.ir = ir
        self.project_name = ir.get("project", "Projeto_IMORTAL")
        
    def translate_expr_pt(self, expr: Any) -> str:
        """Traduz expressões da IR para uma versão em português fluida."""
        if isinstance(expr, int):
            return str(expr)
        if isinstance(expr, str):
            if expr == "HIGH": return "LÓGICO ALTO (5V)"
            if expr == "LOW": return "LÓGICO BAIXO (0V)"
            if expr == "INPUT": return "ENTRADA"
            if expr == "OUTPUT": return "SAÍDA"
            if expr == "INPUT_PULLUP": return "ENTRADA COM PULL-UP ATIVO"
            return f"variável {expr}"
        if isinstance(expr, dict):
            op = expr.get("op")
            left = self.translate_expr_pt(expr.get("left"))
            right = self.translate_expr_pt(expr.get("right"))
            
            # Mapeamento amigável de operadores
            op_map = {
                "+": "mais", "-": "menos", "*": "vezes", "/": "dividido por",
                "==": "for igual a", "!=": "for diferente de",
                "<": "for menor que", ">": "for maior que",
                "<=": "for menor ou igual a", ">=": "for maior ou igual a"
            }
            friendly_op = op_map.get(op, op)
            return f"({left} {friendly_op} {right})"
        return "0"

    def translate_instruction_pt(self, instr: Dict[str, Any], indent_level: int = 0) -> str:
        """Traduz recursivamente uma instrução para pseudocódigo em português com indentação."""
        indent = "    " * indent_level
        op = instr.get("op")
        
        if op == "pin_mode":
            pin = self.translate_expr_pt(instr.get("pin"))
            mode = self.translate_expr_pt(instr.get("mode"))
            return f"{indent}* CONFIGURAR o {pin} como {mode}."
            
        elif op == "digital_write":
            pin = self.translate_expr_pt(instr.get("pin"))
            val = self.translate_expr_pt(instr.get("value"))
            return f"{indent}* DEFINIR o {pin} para {val}."
            
        elif op == "analog_write":
            pin = self.translate_expr_pt(instr.get("pin"))
            val = self.translate_expr_pt(instr.get("value"))
            return f"{indent}* DEFINIR intensidade PWM do {pin} para {val} (escala 0-255)."
            
        elif op == "digital_read":
            pin = self.translate_expr_pt(instr.get("pin"))
            var = instr.get("variable")
            return f"{indent}* LER estado lógico do {pin} e SALVAR na variável '{var}'."
            
        elif op == "analog_read":
            pin = self.translate_expr_pt(instr.get("pin"))
            var = instr.get("variable")
            return f"{indent}* LER intensidade analógica do {pin} e SALVAR na variável '{var}'."
            
        elif op == "delay_ms":
            val = self.translate_expr_pt(instr.get("value"))
            return f"{indent}* AGUARDAR {val} milissegundos."
            
        elif op == "assign":
            var = instr.get("variable")
            val = self.translate_expr_pt(instr.get("value"))
            idx_expr = instr.get("index")
            if idx_expr is not None:
                idx = self.translate_expr_pt(idx_expr)
                return f"{indent}* ATRIBUIR ao vetor '{var}' na posição [{idx}] o valor: {val}."
            return f"{indent}* ATRIBUIR à variável '{var}' o valor: {val}."
            
        elif op == "serial_print":
            val = self.translate_expr_pt(instr.get("value"))
            return f"{indent}* ENVIAR para o terminal do PC (Serial): {val}."
            
        elif op == "if":
            cond = self.translate_expr_pt(instr.get("condition"))
            then_instrs = instr.get("then", [])
            else_instrs = instr.get("else", [])
            
            out = f"{indent}* SE a condição ({cond}) for VERDADEIRA, FAÇA:\n"
            out += "\n".join(self.translate_instruction_pt(t, indent_level + 1) for t in then_instrs)
            
            if else_instrs:
                out += f"\n{indent}  CASO CONTRÁRIO (SENÃO), FAÇA:\n"
                out += "\n".join(self.translate_instruction_pt(e, indent_level + 1) for e in else_instrs)
            return out
            
        elif op == "while":
            cond = self.translate_expr_pt(instr.get("condition"))
            body_instrs = instr.get("body", [])
            
            out = f"{indent}* ENQUANTO a condição ({cond}) continuar VERDADEIRA, FAÇA:\n"
            out += "\n".join(self.translate_instruction_pt(b, indent_level + 1) for b in body_instrs)
            return out
            
        return f"{indent}// Ação desconhecida: {op}"

    def to_pseudocode(self) -> str:
        """Gera o documento completo de pseudocódigo da IR."""
        pc = []
        pc.append(f"# Engenharia Reversa: {self.project_name.upper()}\n")
        
        # 1. Recursos Declarados
        pc.append("## 📦 Recursos de Memória & Hardware")
        for decl in self.ir.get("declarations", []):
            name = decl["name"]
            dtype = decl["type"]
            if dtype == "const_int":
                pc.append(f"- **Pino Constante / Limite**: `{name}` mapeia para o valor físico `{decl['value']}`.")
            elif dtype == "int":
                pc.append(f"- **Registrador de Dados (Inteiro)**: `{name}` (inicia em `{decl.get('initial_value', 0)}`, limites: `{decl.get('min_val', -32768)}` a `{decl.get('max_val', 32767)}`).")
            elif dtype == "bool":
                pc.append(f"- **Interruptor Lógico (Booleano)**: `{name}` (inicia como `{decl.get('initial_value', False)}`).")
            elif dtype == "array":
                pc.append(f"- **Vetor Estático (Memória Sequencial)**: `{name}` com `{decl['size']}` slots disponíveis.")
        
        pc.append("")
        
        # 2. Setup
        pc.append("## ⚙️ Bloco de Inicialização (Roda uma única vez no Boot)")
        setup_instrs = self.ir.get("setup", [])
        if setup_instrs:
            for instr in setup_instrs:
                pc.append(self.translate_instruction_pt(instr, 0))
        else:
            pc.append("- Nenhuma configuração de hardware pendente no boot.")
            
        pc.append("")
        
        # 3. Loop
        pc.append("## 🔄 Bloco de Operação Infinita (Ciclos contínuos de CPU)")
        loop_instrs = self.ir.get("loop", [])
        if loop_instrs:
            for instr in loop_instrs:
                pc.append(self.translate_instruction_pt(instr, 0))
        else:
            pc.append("- O processador entrará em modo ocioso contínuo (loop vazio).")
            
        return "\n".join(pc)

    def to_flowchart_nodes(self) -> List[Dict[str, Any]]:
        """
        Converte a estrutura da IR em nós lógicos planos e conexões
        para facilitar a plotagem visual no Frontend.
        """
        nodes = []
        node_id = 0
        
        # Bloco Setup
        nodes.append({"id": "start_setup", "label": "INICIALIZAÇÃO DO SISTEMA", "type": "start"})
        prev_id = "start_setup"
        
        for instr in self.ir.get("setup", []):
            node_id += 1
            curr_id = f"setup_{node_id}"
            nodes.append({
                "id": curr_id,
                "label": self.translate_instruction_pt(instr, 0).replace("* ", ""),
                "type": "action",
                "parent": prev_id
            })
            prev_id = curr_id
            
        # Transição para o Loop
        node_id += 1
        loop_start_id = f"loop_start"
        nodes.append({
            "id": loop_start_id,
            "label": "INÍCIO DO LOOP INFINITO",
            "type": "loop_header",
            "parent": prev_id
        })
        prev_id = loop_start_id
        
        # Loop instructions
        for instr in self.ir.get("loop", []):
            node_id += 1
            curr_id = f"loop_{node_id}"
            nodes.append({
                "id": curr_id,
                "label": self.translate_instruction_pt(instr, 0).replace("* ", ""),
                "type": "action" if instr.get("op") != "if" else "condition",
                "parent": prev_id
            })
            prev_id = curr_id
            
        # Conexão final volta pro loop_start
        nodes.append({
            "id": "loop_back",
            "label": "RETORNAR AO INÍCIO DO LOOP",
            "type": "loop_footer",
            "parent": prev_id,
            "target": loop_start_id
        })
        
        return nodes
