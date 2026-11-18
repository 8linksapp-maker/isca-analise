import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ehRobo, extrairUtms, registrarConversao, registrarVisita, utmSchema, ISCA } from './utm';

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

  it('registrarVisita salva o user_agent quando vem', async () => {
    await registrarVisita({ utm_source: 'youtube' }, 'Mozilla/5.0 (iPhone)');
    expect(insert).toHaveBeenCalledWith({ isca: ISCA, utm_source: 'youtube', user_agent: 'Mozilla/5.0 (iPhone)' });
  });

  it('sem a coluna user_agent, grava de novo sem ela', async () => {
    insert.mockResolvedValueOnce({ error: { message: "Could not find the 'user_agent' column" } });
    await registrarVisita({ utm_source: 'youtube' }, 'Mozilla/5.0');
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenLastCalledWith({ isca: ISCA, utm_source: 'youtube' });
  });

  it('ehRobo: pega crawlers, headless e UA vazio; deixa navegador comum', () => {
    expect(ehRobo('')).toBe(true);
    expect(ehRobo(null)).toBe(true);
    expect(ehRobo('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(ehRobo('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0 Safari/537.36')).toBe(true);
    expect(ehRobo('Mozilla/5.0 (compatible; Google-InspectionTool/1.0)')).toBe(true);
    expect(ehRobo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(ehRobo('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36')).toBe(false);
  });
});
