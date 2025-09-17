export interface Usuario {
  id?: number;          // opcional porque lo genera la BD
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'editor' | 'lector';  // restringido a los valores válidos
}
