import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enviarLembreteAula } from './aula';

const selectLeads = vi.fn();
const enviarEmailMock = vi.fn(async () => true);

vi.mock('./supabase', () => ({
  supabaseServer: () => ({
    from: (table: string) => {
      if (table === 'analise_leads') {
        return { select: () => ({ order: () => selectLeads() }) };
      }
      return { select: async () => ({ data: [], error: null }) };
    },
  }),
}));

vi.mock('./email', () => ({
  enviarEmail: (...a: unknown[]) => enviarEmailMock(...(a as [])),
}));

vi.mock('./settings', () => ({
  getSettings: async () => ({ link_aula: 'https://zoom.us/j/teste' }),
}));

describe('enviarLembreteAula', () => {
  beforeEach(() => {
    selectLeads.mockReset();
    enviarEmailMock.mockReset();
    enviarEmailMock.mockResolvedValue(true);
  });

  it('envia para TODOS os leads com o link da aula (sem grupo de WhatsApp)', async () => {
    selectLeads.mockResolvedValue({
      data: [
        { nome: 'Um', email: 'um@t.com', segmento: 'agencia' },
        { nome: 'Dois', email: 'dois@t.com', segmento: 'freelancer' },
        { nome: 'Três', email: 'tres@t.com', segmento: 'dono_de_negocio' },
      ],
      error: null,
    });

    const r = await enviarLembreteAula();

    expect(r).toEqual({ total: 3, enviados: 3, falhas: 0 });
    expect(enviarEmailMock).toHaveBeenCalledTimes(3);
    const p = enviarEmailMock.mock.calls[1][0] as any;
    expect(p.html).toContain('https://zoom.us/j/teste');
    expect(p.html).not.toContain('WhatsApp');
  });

  it('lista vazia → não envia nada', async () => {
    selectLeads.mockResolvedValue({ data: [], error: null });
    const r = await enviarLembreteAula();
    expect(r).toEqual({ total: 0, enviados: 0, falhas: 0 });
    expect(enviarEmailMock).not.toHaveBeenCalled();
  });

  it('falha pontual de email conta falha, não explode o lote', async () => {
    selectLeads.mockResolvedValue({
      data: [
        { nome: 'Um', email: 'um@t.com', segmento: 'agencia' },
        { nome: 'Dois', email: 'dois@t.com', segmento: 'agencia' },
      ],
      error: null,
    });
    enviarEmailMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const r = await enviarLembreteAula();
    expect(r).toEqual({ total: 2, enviados: 1, falhas: 1 });
  });

  it('erro do banco → lança', async () => {
    selectLeads.mockResolvedValue({ data: null, error: { message: 'db fora' } });
    await expect(enviarLembreteAula()).rejects.toThrow('db fora');
  });
});
