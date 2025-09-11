import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

interface ComponenteBase {
  id: string;
  tipo: 'modulo' | 'inversor' | 'estrutura' | 'outros';
  marca: string;
  modelo: string;
  potencia?: number;
  especificacoes: string[];
  precoReferencia?: number;
  disponivel: boolean;
  createdAt: string;
  updatedAt: string;
}

const COMPONENTES_PATH = path.join(process.cwd(), 'src/data/sistema/componentes.json');

// Dados iniciais de componentes mais utilizados
const COMPONENTES_INICIAIS = {
  modulos: [
    {
      id: 'mod-canadian-540w',
      tipo: 'modulo' as const,
      marca: 'Canadian Solar',
      modelo: 'HiKu6 Mono PERC CS6R-540MS',
      potencia: 540,
      especificacoes: [
        'Eficiência: 20.9%',
        'Tensão Máxima: 40.9V',
        'Corrente Máxima: 13.20A',
        'Dimensões: 2279x1134x35mm',
        'Garantia: 12 anos produto, 25 anos performance'
      ],
      precoReferencia: 450.00,
      disponivel: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'mod-jinko-550w',
      tipo: 'modulo' as const,
      marca: 'Jinko Solar',
      modelo: 'Tiger Neo N-type JKM550N-72HL4',
      potencia: 550,
      especificacoes: [
        'Eficiência: 21.25%',
        'Tecnologia N-type TOPCon',
        'Tensão Máxima: 41.8V',
        'Corrente Máxima: 13.16A',
        'Coeficiente de temperatura: -0.30%/°C'
      ],
      precoReferencia: 480.00,
      disponivel: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'mod-trina-545w',
      tipo: 'modulo' as const,
      marca: 'Trina Solar',
      modelo: 'Vertex S+ TSM-545NEG9R.28',
      potencia: 545,
      especificacoes: [
        'Eficiência: 21.1%',
        'Tecnologia Mono PERC',
        'Tensão Máxima: 41.2V',
        'Corrente Máxima: 13.25A',
        'Resistente à degradação PID'
      ],
      precoReferencia: 465.00,
      disponivel: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  inversores: [
    {
      id: 'inv-growatt-10k',
      tipo: 'inversor' as const,
      marca: 'Growatt',
      modelo: 'MIN 10000TL-XH',
      potencia: 10000,
      especificacoes: [
        'Potência nominal: 10kW',
        'Eficiência máxima: 98.4%',
        'MPPT: 2 trackers',
        'Tensão máxima: 1000V',
        'Monitoramento WiFi integrado'
      ],
      precoReferencia: 3500.00,
      disponivel: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'inv-fronius-8k',
      tipo: 'inversor' as const,
      marca: 'Fronius',
      modelo: 'Primo 8.2-1',
      potencia: 8200,
      especificacoes: [
        'Potência nominal: 8.2kW',
        'Eficiência máxima: 98.1%',
        'MPPT: 1 tracker',
        'Proteção IP65',
        'Garantia: 5 anos'
      ],
      precoReferencia: 4200.00,
      disponivel: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'inv-solis-15k',
      tipo: 'inversor' as const,
      marca: 'Solis',
      modelo: '3P15K-4G',
      potencia: 15000,
      especificacoes: [
        'Potência nominal: 15kW',
        'Eficiência máxima: 98.3%',
        'MPPT: 2 trackers',
        'Proteção IP65',
        'Display LCD integrado'
      ],
      precoReferencia: 5800.00,
      disponivel: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

async function initializeComponentes() {
  try {
    await fs.access(COMPONENTES_PATH);
  } catch {
    // Arquivo não existe, criar com dados iniciais
    const componentesDir = path.dirname(COMPONENTES_PATH);
    await fs.mkdir(componentesDir, { recursive: true });
    await fs.writeFile(COMPONENTES_PATH, JSON.stringify(COMPONENTES_INICIAIS, null, 2), 'utf8');
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await initializeComponentes();

  if (req.method === 'GET') {
    try {
      const componentesData = await fs.readFile(COMPONENTES_PATH, 'utf8');
      const componentes = JSON.parse(componentesData);

      // Filtrar apenas componentes disponíveis
      const componentesFiltrados = {
        modulos: componentes.modulos?.filter((c: ComponenteBase) => c.disponivel) || [],
        inversores: componentes.inversores?.filter((c: ComponenteBase) => c.disponivel) || []
      };

      res.status(200).json(componentesFiltrados);
    } catch (error) {
      console.error('Erro ao listar componentes:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'POST') {
    try {
      const novoComponente: ComponenteBase = {
        ...req.body,
        id: `${req.body.tipo}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        disponivel: true
      };

      // Validação
      if (!novoComponente.marca || !novoComponente.modelo || !novoComponente.tipo) {
        return res.status(400).json({ 
          message: 'Marca, modelo e tipo são obrigatórios' 
        });
      }

      const componentesData = await fs.readFile(COMPONENTES_PATH, 'utf8');
      const componentes = JSON.parse(componentesData);

      // Adicionar componente na categoria apropriada
      if (novoComponente.tipo === 'modulo') {
        if (!componentes.modulos) componentes.modulos = [];
        componentes.modulos.push(novoComponente);
      } else if (novoComponente.tipo === 'inversor') {
        if (!componentes.inversores) componentes.inversores = [];
        componentes.inversores.push(novoComponente);
      }

      await fs.writeFile(COMPONENTES_PATH, JSON.stringify(componentes, null, 2), 'utf8');

      res.status(201).json({ 
        message: 'Componente criado com sucesso',
        componente: novoComponente
      });
    } catch (error) {
      console.error('Erro ao criar componente:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}