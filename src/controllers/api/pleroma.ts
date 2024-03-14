import { type AppController } from '@/app.ts';
import { Conf } from '@/config.ts';
import { z } from '@/deps.ts';
import { configSchema, elixirTupleSchema, type PleromaConfig } from '@/schemas/pleroma-api.ts';
import { AdminSigner } from '@/signers/AdminSigner.ts';
import { eventsDB } from '@/storages.ts';
import { createAdminEvent } from '@/utils/api.ts';
import { jsonSchema } from '@/schema.ts';

const frontendConfigController: AppController = async (c) => {
  const configs = await getConfigs(c.req.raw.signal);
  const frontendConfig = configs.find(({ group, key }) => group === ':pleroma' && key === ':frontend_configurations');

  if (frontendConfig) {
    const schema = elixirTupleSchema.transform(({ tuple }) => tuple).array();
    const data = schema.parse(frontendConfig.value).reduce<Record<string, unknown>>((result, [name, data]) => {
      result[name.replace(/^:/, '')] = data;
      return result;
    }, {});
    return c.json(data);
  } else {
    return c.json({});
  }
};

const configController: AppController = async (c) => {
  const configs = await getConfigs(c.req.raw.signal);
  return c.json({ configs, need_reboot: false });
};

/** Pleroma admin config controller. */
const updateConfigController: AppController = async (c) => {
  const { pubkey } = Conf;

  const configs = await getConfigs(c.req.raw.signal);
  const { configs: newConfigs } = z.object({ configs: z.array(configSchema) }).parse(await c.req.json());

  for (const { group, key, value } of newConfigs) {
    const index = configs.findIndex((c) => c.group === group && c.key === key);
    if (index === -1) {
      configs.push({ group, key, value });
    } else {
      configs[index].value = value;
    }
  }

  await createAdminEvent({
    kind: 30078,
    content: await new AdminSigner().nip44.encrypt(pubkey, JSON.stringify(configs)),
    tags: [['d', 'pub.ditto.pleroma.config']],
  }, c);

  return c.json({ configs: newConfigs, need_reboot: false });
};

const pleromaAdminDeleteStatusController: AppController = async (c) => {
  await createAdminEvent({
    kind: 5,
    tags: [['e', c.req.param('id')]],
  }, c);

  return c.json({});
};

async function getConfigs(signal: AbortSignal): Promise<PleromaConfig[]> {
  const { pubkey } = Conf;

  const [event] = await eventsDB.query([{
    kinds: [30078],
    authors: [pubkey],
    '#d': ['pub.ditto.pleroma.config'],
    limit: 1,
  }], { signal });

  try {
    const decrypted = await new AdminSigner().nip44.decrypt(Conf.pubkey, event.content);
    return jsonSchema.pipe(configSchema.array()).catch([]).parse(decrypted);
  } catch (_e) {
    return [];
  }
}

export { configController, frontendConfigController, pleromaAdminDeleteStatusController, updateConfigController };
