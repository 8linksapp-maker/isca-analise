import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cadastroSchema, criarLead } from './cadastro';

const upsert = vi.fn();
const enviarEmailMock = vi.fn(async () => true);

vi.mock('./supabase', () => ({
  supabaseServer: () => ({
    from: () => ({ upsert: (...a: unknown[]) => upsert(...(a as [])) }),
  }),
}));

vi.mock('./email', () => ({
  enviarEmail: (...a: unknown[]) => enviarEmailMock(...(a as [])),
}));

vi.mock('./settings', () => ({
  getSettings: async () => ({
    link_aula: 'https://zoom.us/j/teste',
    grupo_agencia: 'https://chat.whatsapp.com/AG',
    grupo_dono_de_negocio: 'https://chat.whatsapp.com/DN',
    grupo_freelancer: 'https://chat.whatsapp.com/FR',
  }),
  grupoDoSegmento: (s: Record<string, string>, seg: string) => s[`grupo_${seg}`] ?? '',
  SEGMENTOS: {
    agencia: { label: 'Agência', settingKey: 'grupo_agencia', emoji: '🏢' },
    dono_de_negocio: { label: 'Dono', settingKey: 'grupo_dono_de_negocio', emoji: '💼' },
    freelancer: { label: 'Freela', settingKey: 'grupo_freelancer', emoji: '🧑‍💻' },
  },
  ehSegmento: (v: unknown) => typeof v === 'string' && v.startsWith('grupo') === false,
}));

const valido = {
  nome: 'Bruno',
  email: 'bruno@teste.com',
  whatsapp: '(11) 91234-5678',
  segmento: 'agencia',
};

describe('cadastroSchema — whatsapp aceita qualquer DDD', () => {
  it.each([
    ['(11) 91234-5678', '11912345678'],
    ['(31) 98765-4321', '31987654321'],
    ['85 3234-5678', '8532345678'],
    ['+55 (21) 99999-8888', '21999998888'],
    ['5511912345678', '11912345678'],
  ])('%s → %s', (entrada, esperado) => {
    const r = cadastroSchema.safeParse({ ...valido, whatsapp: entrada });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.whatsapp).toBe(esperado);
  });

  it.each(['123', '(1) 91234-567', '1191234567890', '09999999999', ''])(
    'rejeita "%s"',
    (entrada) => {
      expect(cadastroSchema.safeParse({ ...valido, whatsapp: entrada }).success).toBe(false);
    },
  );

  it('rejeita segmento fora das 3 opções', () => {
    expect(cadastroSchema.safeParse({ ...valido, segmento: 'influencer' }).success).toBe(false);
  });

  it('rejeita email inválido e nome vazio', () => {
    expect(cadastroSchema.safeParse({ ...valido, email: 'nao' }).success).toBe(false);
    expect(cadastroSchema.safeParse({ ...valido, nome: '  ' }).success).toBe(false);
  });
});

describe('criarLead', () => {
  beforeEach(() => {
    upsert.mockReset();
    enviarEmailMock.mockReset();
    upsert.mockResolvedValue({ error: null });
    enviarEmailMock.mockResolvedValue(true);
  });

  it('grava via upsert (re-cadastro substitui o antigo)', async () => {
    const data = cadastroSchema.parse(valido);
    const r = await criarLead(data);

    expect(r).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsert.mock.calls[0];
    expect(payload).toMatchObject({
      nome: 'Bruno',
      email: 'bruno@teste.com',
      whatsapp: '11912345678',
      segmento: 'agencia',
    });
    expect(opts).toEqual({ onConflict: 'email' });
  });

  it('envia boas-vindas com link da aula e do grupo CERTO do segmento', async () => {
    const data = cadastroSchema.parse({ ...valido, segmento: 'freelancer' });
    await criarLead(data);

    expect(enviarEmailMock).toHaveBeenCalledTimes(1);
    const p = enviarEmailMock.mock.calls[0][0] as any;
    expect(p.html).toContain('https://zoom.us/j/teste');
    expect(p.html).toContain('https://chat.whatsapp.com/FR');
    expect(p.html).not.toContain('https://chat.whatsapp.com/AG');
  });

  it('falha do Brevo não derruba o cadastro', async () => {
    enviarEmailMock.mockRejectedValue(new Error('brevo fora'));
    const data = cadastroSchema.parse(valido);
    const r = await criarLead(data);
    expect(r).toEqual({ ok: true });
  });

  it('falha do banco → 500 e NÃO envia email', async () => {
    upsert.mockResolvedValue({ error: { message: 'boom' } });
    const data = cadastroSchema.parse(valido);
    const r = await criarLead(data);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(500);
    expect(enviarEmailMock).not.toHaveBeenCalled();
  });
});
