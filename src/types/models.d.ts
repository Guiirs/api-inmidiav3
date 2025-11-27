import { Document, Types } from 'mongoose';

/**
 * Base Mongoose document interface
 */
export interface IBaseDocument extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cliente Interface
 */
export interface ICliente extends IBaseDocument {
  nome: string;
  cpfCnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  ativo: boolean;
  empresa: Types.ObjectId;
}

/**
 * Placa Interface
 */
export interface IPlaca extends IBaseDocument {
  numero_placa: string;
  coordenadas?: string;
  nomeDaRua?: string;
  tamanho?: string;
  imagem?: string;
  disponivel: boolean;
  regiao: Types.ObjectId;
  empresa: Types.ObjectId;
}

/**
 * BiWeek Interface
 */
export interface IBiWeek extends IBaseDocument {
  bi_week_id: string;
  ano: number;
  numero: number;
  dataInicio: Date;
  dataFim: Date;
  descricao?: string;
  ativo: boolean;
  getFormattedPeriod(): string;
}

/**
 * Aluguel Interface
 */
export interface IAluguel extends IBaseDocument {
  clienteId: Types.ObjectId | ICliente;
  placaId: Types.ObjectId | IPlaca;
  empresaId: Types.ObjectId | IEmpresa;
  periodType: string;
  startDate: Date;
  endDate: Date;
  biWeekIds?: string[];
  biWeeks?: Types.ObjectId[];
  // Legacy fields
  data_inicio?: Date;
  data_fim?: Date;
  bi_week_ids?: string[];
  // PI integration
  pi_code?: string;
  proposta_interna?: Types.ObjectId;
  tipo: 'manual' | 'pi';
  status: 'ativo' | 'finalizado' | 'cancelado';
  observacoes?: string;
}

/**
 * User Interface
 */
export interface IUser extends IBaseDocument {
  username: string;
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  role: 'user' | 'admin' | 'superadmin';
  ativo: boolean;
  lastLogin?: Date;
  resetToken?: string;
  tokenExpiry?: Date;
  empresaId: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * Empresa Interface
 */
export interface IEmpresa extends IBaseDocument {
  nome: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  ativo: boolean;
  apiKey?: string;
  api_key_hash?: string;
  api_key_prefix?: string;
  enforce_bi_week_validation?: boolean;
  api_key_history?: Array<{
    regenerated_by: Types.ObjectId;
    regenerated_at: Date;
    ip_address?: string;
    user_agent?: string;
  }>;
  generateApiKey(): string;
}

/**
 * Regiao Interface
 */
export interface IRegiao extends IBaseDocument {
  nome: string;
  codigo: string;
  descricao?: string;
  ativo: boolean;
  empresa: Types.ObjectId;
}

/**
 * Contrato Interface
 */
export interface IContrato extends IBaseDocument {
  numero: string;
  clienteId: Types.ObjectId | ICliente;
  empresaId: Types.ObjectId | IEmpresa;
  piId: Types.ObjectId;
  status: 'rascunho' | 'ativo' | 'concluido' | 'cancelado';
}

/**
 * PropostaInterna Interface
 */
export interface IPropostaInterna extends IBaseDocument {
  empresaId: Types.ObjectId | IEmpresa;
  clienteId: Types.ObjectId | ICliente;
  pi_code: string;
  periodType: string;
  startDate: Date;
  endDate: Date;
  biWeekIds?: string[];
  biWeeks?: Types.ObjectId[];
  // Legacy fields
  tipoPeriodo?: 'quinzenal' | 'mensal';
  dataInicio?: Date;
  dataFim?: Date;
  valorTotal: number;
  valorProducao?: number;
  descricao: string;
  descricaoPeriodo?: string;
  produto?: string;
  placas?: Types.ObjectId[];
  formaPagamento?: string;
  status: 'em_andamento' | 'concluida' | 'vencida';
}

/**
 * Webhook Interface
 */
export interface IWebhook extends IBaseDocument {
  empresa: Types.ObjectId | IEmpresa;
  nome: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  secret: string;
  retry_config: {
    max_tentativas: number;
    timeout_ms: number;
  };
  headers: Map<string, string>;
  estatisticas: {
    total_disparos: number;
    sucessos: number;
    falhas: number;
    ultimo_disparo?: Date;
    ultimo_sucesso?: Date;
    ultima_falha?: Date;
    ultima_falha_detalhes?: string;
  };
  criado_por: Types.ObjectId | IUser;
  registrarDisparo(sucesso: boolean, detalhes?: string | null): Promise<IWebhook>;
  escutaEvento(evento: string): boolean;
}

/**
 * PiGenJob Interface
 */
export interface IPiGenJob extends IBaseDocument {
  jobId: string;
  type: string;
  contratoId: Types.ObjectId | IContrato;
  empresaId?: Types.ObjectId | IEmpresa;
  status: 'queued' | 'running' | 'done' | 'failed';
  resultPath?: string;
  resultUrl?: string;
  error?: string;
}
