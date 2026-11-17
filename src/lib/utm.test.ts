import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extrairUtms, registrarConversao, registrarVisita, utmSchema, ISCA } from './utm';

const insert = vi.fn(async () => ({ error: null as { message: string } | null }));
const from = vi.fn(() => ({ insert }));

vi.mock('./supabase', () => ({ supabaseServer: () => ({ from }) }));

describe('utm', () => {
  beforeEach(() => {
    insert.mockClear();
    from.mockClear();
    insert.mockResolvedValue({ error: null });
  });

  it('schema: vazio vira undefined e extrairUtms ignora', () => {
    const u = extrairUtms(utmSchema.parse({ utm_source: ' youtube ', utm_medium: '  ' }));
    expect(u).toEqual({ utm_source: 'youtube' });
  });

  it('schema: rejeita UTM com mais de 255 caracteres', () => {
    expect(utmSchema.safeParse({ utm_source: 'a'.repeat(256) }).success).toBe(false);
  });

  it('registrarVisita grava em isca_visitas com o id da isca', async () => {
    await registrarVisita({ utm_source: 'youtube', utm_campaign: 'tut' });
    expect(from).toHaveBeenCalledWith('isca_visitas');
    expect(insert).toHaveBeenCalledWith({ isca: ISCA, utm_source: 'youtube', utm_campaign: 'tut' });
  });

  it('registrarConversao grava em isca_conversoes com email', async () => {
    await registrarConversao('a@b.com', { utm_source: 'youtube' });
    expect(from).toHaveBeenCalledWith('isca_conversoes');
    expect(insert).toHaveBeenCalledWith({ isca: ISCA, email: 'a@b.com', utm_source: 'youtube' });
  });

  it('sem UTM não grava nada', async () => {
    await registrarVisita({});
    await registrarConversao('a@b.com', {});
    expect(insert).not.toHaveBeenCalled();
  });

  it('erro do banco não lança (best-effort)', async () => {
    insert.mockResolvedValue({ error: { message: 'relation does not exist' } });
    await expect(registrarVisita({ utm_source: 'x' })).resolves.toBeUndefined();
    insert.mockRejectedValue(new Error('rede'));
    await expect(registrarConversao('a@b.com', { utm_source: 'x' })).resolves.toBeUndefined();
  });
});
