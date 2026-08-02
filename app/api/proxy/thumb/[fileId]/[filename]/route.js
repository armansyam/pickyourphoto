import { GET as handleProxyGet } from '../route';

export async function GET(request, { params }) {
    return handleProxyGet(request, { params });
}
