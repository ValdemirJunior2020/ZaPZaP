import {adapt} from "../vercel/lib/adapter.mjs";
import {handler} from "../netlify/functions/billing-webhook.mjs";
export default function vercelHandler(request){return adapt(request,handler)}
