export interface Configuracion {
  id?: number;
  usuario_id: number;
  tema?: 'claro' | 'oscuro';
  notificaciones?: boolean;
  actualizado_en?: string;
}
