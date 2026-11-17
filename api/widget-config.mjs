import {adapt} from "../vercel/lib/adapter.mjs";
import {handler} from "../netlify/functions/widget-config.mjs";
export default function vercelHandler(request){return adapt(request,handler)}
