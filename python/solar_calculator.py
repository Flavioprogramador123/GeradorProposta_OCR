#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🐍 PIENG Solar Calculator - Cálculos Técnicos Precisos
Evita alucinações da IA em cálculos matemáticos críticos
"""

import json
import sys
import math
import numpy as np
from typing import Dict, List, Tuple, Any

class SolarCalculator:
    """Calculadora técnica para sistemas solares fotovoltaicos"""
    
    def __init__(self):
        self.IRRADIANCIA_PADRAO = 1000  # W/m²
        self.PERFORMANCE_RATIO_PADRAO = 0.85
        self.DEGRADACAO_ANUAL = 0.005  # 0.5% ao ano
        self.VIDA_UTIL = 25  # anos
        
    def calcular_sistema_completo(self, dados: Dict[str, Any]) -> Dict[str, Any]:
        """Cálculo completo do sistema solar"""
        try:
            # Extrair dados de entrada
            potencia_modulos = float(dados.get('potenciaModulos', 0))  # kWp
            quantidade_modulos = int(dados.get('quantidadeModulos', 0))
            potencia_inversor = float(dados.get('potenciaInversor', 0))  # kW
            hsp_local = float(dados.get('hspLocal', 5.21))  # Horas Sol Pico
            
            # Dados financeiros
            valor_sistema = float(dados.get('valorSistema', 0))  # R$
            tarifa_energia = float(dados.get('tarifaEnergia', 0.65))  # R$/kWh
            consumo_mensal = float(dados.get('consumoMensal', 0))  # kWh/mês
            
            # Parâmetros avançados
            performance_ratio = float(dados.get('performanceRatio', self.PERFORMANCE_RATIO_PADRAO))
            degradacao_anual = float(dados.get('degradacaoAnual', self.DEGRADACAO_ANUAL))
            inflacao = float(dados.get('inflacao', 4.5)) / 100  # %
            selic = float(dados.get('selic', 10.65)) / 100  # %
            vida_util = int(dados.get('vidaUtil', self.VIDA_UTIL))
            
            # Cálculos de geração
            potencia_total_kwp = potencia_modulos * quantidade_modulos / 1000
            geracao_resultados = self.calcular_geracao(
                potencia_total_kwp, hsp_local, performance_ratio
            )
            
            # Cálculos financeiros avançados
            financeiro_resultados = self.calcular_indicadores_financeiros(
                valor_sistema, geracao_resultados['geracao_mensal'], tarifa_energia,
                consumo_mensal, inflacao, selic, degradacao_anual, vida_util
            )
            
            # Análise de dimensionamento
            dimensionamento_resultados = self.analisar_dimensionamento(
                potencia_total_kwp, potencia_inversor, geracao_resultados['geracao_mensal'],
                consumo_mensal, valor_sistema
            )
            
            # Compilar resultado final
            resultado = {
                **geracao_resultados,
                **financeiro_resultados,
                **dimensionamento_resultados,
                'metadata': {
                    'calculado_com': 'Python Scientific Calculator',
                    'versao': '2.0',
                    'timestamp': self.get_timestamp(),
                    'parametros_usados': {
                        'performance_ratio': performance_ratio,
                        'degradacao_anual': degradacao_anual,
                        'vida_util': vida_util,
                        'taxa_desconto': selic
                    }
                }
            }
            
            return resultado
            
        except Exception as e:
            return {
                'error': f'Erro no cálculo Python: {str(e)}',
                'fallback_required': True
            }
    
    def calcular_geracao(self, potencia_kwp: float, hsp: float, pr: float) -> Dict[str, float]:
        """Cálculo preciso de geração de energia"""
        # Geração mensal (kWh)
        geracao_mensal = potencia_kwp * hsp * 30.4 * pr
        
        
        # Geração anual (kWh)
        geracao_anual = geracao_mensal * 12
        
        # Fator de capacidade
        fator_capacidade = (geracao_anual / (potencia_kwp * 8760)) * 100
        
        return {
            'geracao_mensal': round(geracao_mensal, 2),
            'geracao_anual': round(geracao_anual, 2),
            'fator_capacidade': round(fator_capacidade, 2)
        }
    
    def calcular_indicadores_financeiros(self, investimento: float, geracao_mensal: float,
                                       tarifa: float, consumo: float, inflacao: float,
                                       selic: float, degradacao: float, vida_util: int) -> Dict[str, Any]:
        """Cálculos financeiros avançados com crescimento da tarifa"""
        
        # Economia mensal inicial
        economia_mensal = min(geracao_mensal, consumo) * tarifa
        economia_anual_inicial = economia_mensal * 12
        
        # Fluxos de caixa anuais considerando:
        # - Crescimento real da tarifa (inflação + 2% histórico)
        # - Degradação dos módulos
        crescimento_tarifa = inflacao + 0.02  # 2% real histórico
        fluxos_anuais = []
        
        for ano in range(1, vida_util + 1):
            # Geração com degradação
            geracao_ano = geracao_mensal * 12 * (1 - degradacao) ** ano
            
            # Economia limitada pelo consumo
            economia_limitada = min(geracao_ano, consumo * 12)
            
            # Tarifa com crescimento
            tarifa_ano = tarifa * (1 + crescimento_tarifa) ** ano
            
            # Fluxo do ano
            fluxo_ano = economia_limitada * tarifa_ano
            fluxos_anuais.append(fluxo_ano)
        
        # Cálculo do VPL
        vpl = -investimento
        for i, fluxo in enumerate(fluxos_anuais):
            vpl += fluxo / (1 + selic) ** (i + 1)
        
        # Cálculo da TIR usando método Newton-Raphson
        tir = self.calcular_tir(investimento, fluxos_anuais)
        
        # Payback descontado
        payback_descontado = self.calcular_payback_descontado(investimento, fluxos_anuais, selic)
        
        # Payback simples (primeiro ano)
        payback_simples = investimento / economia_anual_inicial
        
        # Cobertura do consumo
        cobertura = (geracao_mensal / consumo) * 100 if consumo > 0 else 0
        
        return {
            'economia': {
                'mensal': round(economia_mensal, 2),
                'anual': round(economia_anual_inicial, 2),
                'acumulada25Anos': round(sum(fluxos_anuais), 2)
            },
            'cobertura': round(cobertura, 1),
            'payback': {
                'simples': round(payback_simples, 2),
                'descontado': round(payback_descontado, 2)
            },
            'tir': round(tir * 100, 2),  # Converter para %
            'vpl': round(vpl, 2),
            'fluxos_anuais': [round(f, 2) for f in fluxos_anuais[:10]]  # Primeiros 10 anos
        }
    
    def calcular_tir(self, investimento: float, fluxos: List[float]) -> float:
        """Cálculo da TIR usando método Newton-Raphson"""
        def npv(taxa):
            return -investimento + sum(fluxo / (1 + taxa) ** (i + 1) for i, fluxo in enumerate(fluxos))
        
        def npv_derivative(taxa):
            return sum(-(i + 1) * fluxo / (1 + taxa) ** (i + 2) for i, fluxo in enumerate(fluxos))
        
        # Estimativa inicial
        taxa = 0.1  # 10%
        
        for _ in range(100):  # Máximo 100 iterações
            try:
                npv_val = npv(taxa)
                npv_der = npv_derivative(taxa)
                
                if abs(npv_val) < 1e-6:  # Convergiu
                    break
                    
                if abs(npv_der) < 1e-10:  # Evitar divisão por zero
                    break
                    
                taxa = taxa - npv_val / npv_der
                
                # Limitar taxa entre -50% e 200%
                taxa = max(-0.5, min(taxa, 2.0))
                
            except (ZeroDivisionError, OverflowError):
                break
        
        return max(taxa, -0.5)  # TIR mínima de -50%
    
    def calcular_payback_descontado(self, investimento: float, fluxos: List[float], taxa_desconto: float) -> float:
        """Cálculo do payback descontado"""
        saldo = investimento
        
        for ano, fluxo in enumerate(fluxos, 1):
            valor_presente = fluxo / (1 + taxa_desconto) ** ano
            saldo -= valor_presente
            
            if saldo <= 0:
                # Interpolação linear para precisão
                if ano > 1:
                    fluxo_anterior = fluxos[ano-2] / (1 + taxa_desconto) ** (ano-1)
                    return ano - 1 + (saldo + valor_presente) / valor_presente
                else:
                    return ano
        
        return float('inf')  # Não há payback
    
    def analisar_dimensionamento(self, potencia_kwp: float, potencia_inversor: float,
                                geracao_mensal: float, consumo_mensal: float,
                                valor_sistema: float) -> Dict[str, Any]:
        """Análise técnica do dimensionamento"""
        
        observacoes = []
        recomendacoes = []
        adequado = True
        score = 100
        
        # 1. Análise CC/CA Ratio
        if potencia_inversor > 0:
            cc_ca_ratio = potencia_kwp / potencia_inversor
            
            if cc_ca_ratio < 1.0:
                observacoes.append(f"Ratio CC/CA baixo ({cc_ca_ratio:.2f})")
                recomendacoes.append("Considerar inversor menor ou mais módulos")
                adequado = False
                score -= 15
            elif cc_ca_ratio > 1.5:
                observacoes.append(f"Ratio CC/CA alto ({cc_ca_ratio:.2f})")
                recomendacoes.append("Possível perda por limitação do inversor")
                score -= 10
            else:
                observacoes.append(f"Ratio CC/CA adequado ({cc_ca_ratio:.2f})")
        
        # 2. Análise de cobertura
        if consumo_mensal > 0:
            cobertura = (geracao_mensal / consumo_mensal) * 100
            
            if cobertura < 70:
                observacoes.append(f"Sistema subdimensionado ({cobertura:.1f}% do consumo)")
                recomendacoes.append("Considerar aumentar a potência do sistema")
                adequado = False
                score -= 20
            elif cobertura > 130:
                observacoes.append(f"Sistema superdimensionado ({cobertura:.1f}% do consumo)")
                recomendacoes.append("Sistema pode ser otimizado para reduzir custos")
                score -= 15
            else:
                observacoes.append(f"Dimensionamento adequado ({cobertura:.1f}% do consumo)")
        
        # 3. Análise de custo por kWp
        if valor_sistema > 0 and potencia_kwp > 0:
            custo_kwp = valor_sistema / potencia_kwp
            
            if custo_kwp < 3000:
                observacoes.append(f"Excelente custo/kWp (R$ {custo_kwp:.0f}/kWp)")
                score += 10
            elif custo_kwp > 6000:
                observacoes.append(f"Custo/kWp elevado (R$ {custo_kwp:.0f}/kWp)")
                recomendacoes.append("Buscar fornecedores com melhor custo-benefício")
                score -= 10
            else:
                observacoes.append(f"Custo/kWp adequado (R$ {custo_kwp:.0f}/kWp)")
        
        # 4. Classificação final
        if score >= 90:
            classificacao = "Excelente"
        elif score >= 80:
            classificacao = "Bom"
        elif score >= 70:
            classificacao = "Adequado"
        elif score >= 60:
            classificacao = "Regular"
        else:
            classificacao = "Inadequado"
            adequado = False
        
        return {
            'dimensionamento': {
                'adequado': adequado,
                'score': score,
                'classificacao': classificacao,
                'observacoes': observacoes,
                'recomendacoes': recomendacoes,
                'analise_tecnica': {
                    'cc_ca_ratio': potencia_kwp / potencia_inversor if potencia_inversor > 0 else 0,
                    'custo_kwp': valor_sistema / potencia_kwp if potencia_kwp > 0 else 0,
                    'cobertura_consumo': (geracao_mensal / consumo_mensal * 100) if consumo_mensal > 0 else 0
                }
            }
        }
    
    def get_timestamp(self) -> str:
        """Timestamp atual"""
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def main():
    """Função principal para chamada via CLI"""
    try:
        if len(sys.argv) > 1:
            # Dados passados como argumento JSON
            dados_json = sys.argv[1]
            dados = json.loads(dados_json)
        else:
            # Ler dados do stdin
            dados = json.load(sys.stdin)
        
        calculator = SolarCalculator()
        resultado = calculator.calcular_sistema_completo(dados)
        
        # Retornar resultado como JSON
        print(json.dumps(resultado, ensure_ascii=False, indent=2))
        
    except Exception as e:
        erro = {
            'error': f'Erro no script Python: {str(e)}',
            'fallback_required': True
        }
        print(json.dumps(erro, ensure_ascii=False))
        sys.exit(1)

if __name__ == '__main__':
    main()