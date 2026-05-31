import { mapErrorToResponse } from '../../../src/adapter/http/error-mapper.js';
import { createPagesAdminRouter } from '../../../src/infra/wire/pages-admin-router.js';

export async function onRequest({ request, env, params }) {
  try {
    const remainder = Array.isArray(params.path)
      ? params.path.join('/')
      : String(params.path || '');

    const url = new URL(request.url);
    url.pathname = '/' + remainder;
    const fixedRequest = new Request(url.toString(), request);

    return await createPagesAdminRouter(env).dispatch(fixedRequest, env);
  } catch (error) {
    return mapErrorToResponse(error);
  }
}
