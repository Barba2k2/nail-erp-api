import {
  MessageTemplateType,
  MessageTemplatePurpose,
} from "../dto/create-message-template.dto";

export interface MessageTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: MessageTemplateType;
  purpose: MessageTemplatePurpose;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
  category: "client" | "business" | "appointment" | "service" | "other";
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Cliente
  {
    name: "{{client.name}}",
    description: "Nome completo do cliente",
    example: "Maria Silva",
    category: "client",
  },
  {
    name: "{{client.firstName}}",
    description: "Primeiro nome do cliente",
    example: "Maria",
    category: "client",
  },
  {
    name: "{{client.email}}",
    description: "Email do cliente",
    example: "cliente@email.com",
    category: "client",
  },
  {
    name: "{{client.phone}}",
    description: "Telefone do cliente",
    example: "(11) 98765-4321",
    category: "client",
  },

  // Empresa
  {
    name: "{{business.name}}",
    description: "Nome do negócio",
    example: "Nail Art Design",
    category: "business",
  },
  {
    name: "{{business.phone}}",
    description: "Telefone do negócio",
    example: "(11) 1234-5678",
    category: "business",
  },
  {
    name: "{{business.address}}",
    description: "Endereço do negócio",
    example: "Rua das Flores, 123",
    category: "business",
  },
  {
    name: "{{business.email}}",
    description: "Email do negócio",
    example: "contato@nailart.com",
    category: "business",
  },

  // Agendamento
  {
    name: "{{appointment.date}}",
    description: "Data do agendamento",
    example: "25/03/2025",
    category: "appointment",
  },
  {
    name: "{{appointment.time}}",
    description: "Horário do agendamento",
    example: "14:30",
    category: "appointment",
  },
  {
    name: "{{appointment.service}}",
    description: "Serviço agendado",
    example: "Manicure",
    category: "appointment",
  },
  {
    name: "{{appointment.price}}",
    description: "Preço do serviço",
    example: "R$ 50,00",
    category: "appointment",
  },

  // Serviço
  {
    name: "{{service.name}}",
    description: "Nome do serviço",
    example: "Manicure",
    category: "service",
  },
  {
    name: "{{service.price}}",
    description: "Preço do serviço",
    example: "R$ 50,00",
    category: "service",
  },
  {
    name: "{{service.duration}}",
    description: "Duração do serviço",
    example: "45 minutos",
    category: "service",
  },

  // Outros
  {
    name: "{{resetLink}}",
    description: "Link para redefinição de senha",
    example: "https://...",
    category: "other",
  },
  {
    name: "{{currentDate}}",
    description: "Data atual",
    example: "12/03/2025",
    category: "other",
  },
];
