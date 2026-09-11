/**
 * Method + path-pattern dispatch for the single catch-all function. A path
 * that matches no registered pattern is a 404; a path that matches a pattern
 * under a different method is a 405 — `05-backend.md`'s router description.
 * Params are typed as `Record<string, string>`, merged onto the caller's
 * context so a handler sees `ctx.params.id` without re-parsing the URL.
 */

import { methodNotAllowedError, notFoundError } from './errors'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type RouteParams = Record<string, string>

export type RouteHandler<Ctx> = (req: Request, ctx: Ctx & { params: RouteParams }) => Promise<Response>

interface RegisteredRoute<Ctx> {
  method: HttpMethod
  segments: string[]
  handler: RouteHandler<Ctx>
}

/** The version prefix every request carries and every pattern omits (`CONTRACT.md` §1). */
const API_PREFIX = '/api/v1'

function segmentsOf(pattern: string): string[] {
  return pattern.split('/').filter(Boolean)
}

function matchSegments(routeSegments: string[], pathSegments: string[]): RouteParams | null {
  if (routeSegments.length !== pathSegments.length) return null
  const params: RouteParams = {}
  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i]
    const pathSegment = pathSegments[i]
    if (routeSegment === undefined || pathSegment === undefined) return null
    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = decodeURIComponent(pathSegment)
    } else if (routeSegment !== pathSegment) {
      return null
    }
  }
  return params
}

export class Router<Ctx> {
  private readonly routes: Array<RegisteredRoute<Ctx>> = []

  private add(method: HttpMethod, pattern: string, handler: RouteHandler<Ctx>): void {
    this.routes.push({ method, segments: segmentsOf(pattern), handler })
  }

  get(pattern: string, handler: RouteHandler<Ctx>): void {
    this.add('GET', pattern, handler)
  }
  post(pattern: string, handler: RouteHandler<Ctx>): void {
    this.add('POST', pattern, handler)
  }
  patch(pattern: string, handler: RouteHandler<Ctx>): void {
    this.add('PATCH', pattern, handler)
  }
  put(pattern: string, handler: RouteHandler<Ctx>): void {
    this.add('PUT', pattern, handler)
  }
  delete(pattern: string, handler: RouteHandler<Ctx>): void {
    this.add('DELETE', pattern, handler)
  }

  async dispatch(req: Request, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url)
    const path = url.pathname.startsWith(API_PREFIX) ? url.pathname.slice(API_PREFIX.length) || '/' : url.pathname
    const pathSegments = segmentsOf(path)
    const method = req.method.toUpperCase() as HttpMethod

    let pathMatchedAnyMethod = false
    for (const route of this.routes) {
      const params = matchSegments(route.segments, pathSegments)
      if (params === null) continue
      pathMatchedAnyMethod = true
      if (route.method === method) {
        return route.handler(req, { ...ctx, params })
      }
    }

    if (pathMatchedAnyMethod) throw methodNotAllowedError(method, path)
    throw notFoundError(path)
  }
}

export function createRouter<Ctx>(): Router<Ctx> {
  return new Router<Ctx>()
}
