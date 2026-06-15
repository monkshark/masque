import type { Persona } from '../types'

export interface InjectOptions {
  seed: number
  userAgent: boolean
  languages: boolean
  hardware: boolean
  screen: boolean
  webgl: boolean
  timezone: boolean
  touch: boolean
  webdriver: boolean
  plugins: boolean
  mediaDevices: boolean
  connection: boolean
  speech: boolean
  storage: boolean
  keyboard: boolean
  webgpu: boolean
  battery: boolean
  canvas: boolean
  audio: boolean
  fonts: boolean
  iframes: boolean
  workers: boolean
}

export function applyInPage(persona: Persona, opts: InjectOptions, rootWindow?: Window): void {
  const p = persona
  const root: Window =
    rootWindow || (typeof window !== 'undefined' ? window : (self as unknown as Window))

  const makeRng = (seed: number) => {
    let s = seed >>> 0 || 1
    return () => {
      s ^= s << 13
      s ^= s >>> 17
      s ^= s << 5
      return (s >>> 0) / 4294967296
    }
  }

  const workerSpoof = (data: Persona, o: InjectOptions) => {
    const pp = data
    const g = self as unknown as Record<string, unknown> & { navigator: Record<string, unknown> }
    const defW = (host: object, prop: string, val: unknown) => {
      try {
        let owner: object | null = host
        while (owner && !Object.getOwnPropertyDescriptor(owner, prop)) {
          owner = Object.getPrototypeOf(owner)
        }
        const targets = owner && owner !== host ? [owner, host] : [host]
        for (const t of targets) {
          try {
            Object.defineProperty(t, prop, { get: () => val, configurable: true, enumerable: true })
            return
          } catch {
            void 0
          }
        }
      } catch {
        void 0
      }
    }

    try {
      const n = g.navigator
      if (o.userAgent) {
        defW(n, 'userAgent', pp.ua)
        defW(n, 'appVersion', pp.ua.replace(/^Mozilla\//, ''))
        defW(n, 'platform', pp.platform)
        defW(n, 'userAgentData', {
          brands: pp.uaData.brands.map((b) => ({ ...b })),
          mobile: pp.uaData.mobile,
          platform: pp.uaData.platform,
          getHighEntropyValues: () =>
            Promise.resolve({
              platform: pp.uaData.platform,
              platformVersion: pp.uaData.platformVersion,
              architecture: pp.uaData.architecture,
              bitness: pp.uaData.bitness,
              model: '',
              uaFullVersion: pp.uaData.uaFullVersion,
              fullVersionList: pp.uaData.brands.map((b) => ({ ...b })),
              brands: pp.uaData.brands.map((b) => ({ ...b })),
              mobile: pp.uaData.mobile,
            }),
          toJSON: () => ({ brands: pp.uaData.brands, mobile: pp.uaData.mobile, platform: pp.uaData.platform }),
        })
      }
      if (o.languages) {
        defW(n, 'language', pp.language)
        defW(n, 'languages', Object.freeze([...pp.languages]))
      }
      if (o.hardware) {
        defW(n, 'hardwareConcurrency', pp.hardwareConcurrency)
        defW(n, 'deviceMemory', pp.deviceMemory)
      }
    } catch {
      void 0
    }

    if (o.timezone) {
      try {
        const DTF = (g.Intl as typeof Intl).DateTimeFormat
        const origRO = DTF.prototype.resolvedOptions
        let realTz = ''
        try {
          realTz = origRO.call(new DTF()).timeZone
        } catch {
          void 0
        }
        DTF.prototype.resolvedOptions = function () {
          const r = origRO.call(this)
          if (!realTz || r.timeZone === realTz) r.timeZone = pp.timezone
          return r
        }
        const tzOff = (d: Date) => {
          const parts = new DTF('en-US', {
            timeZone: pp.timezone,
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).formatToParts(d)
          const m: Record<string, number> = {}
          for (const x of parts) if (x.type !== 'literal') m[x.type] = parseInt(x.value, 10)
          const asUTC = Date.UTC(m.year, m.month - 1, m.day, m.hour % 24, m.minute, m.second)
          return Math.round((d.getTime() - asUTC) / 60000)
        }
        ;(g.Date as DateConstructor).prototype.getTimezoneOffset = function () {
          try {
            return tzOff(this)
          } catch {
            return 0
          }
        }
      } catch {
        void 0
      }
    }

    if (o.webgl) {
      try {
        const patch = (proto: { getParameter: (n: number) => unknown } | undefined) => {
          if (!proto) return
          const orig = proto.getParameter
          proto.getParameter = function (this: unknown, param: number) {
            if (param === 0x9245) return pp.webgl.vendor
            if (param === 0x9246) return pp.webgl.renderer
            return orig.call(this, param)
          }
        }
        const w1 = g.WebGLRenderingContext as { prototype: { getParameter: (n: number) => unknown } } | undefined
        const w2 = g.WebGL2RenderingContext as { prototype: { getParameter: (n: number) => unknown } } | undefined
        patch(w1 ? w1.prototype : undefined)
        patch(w2 ? w2.prototype : undefined)
      } catch {
        void 0
      }
    }

    if (o.canvas) {
      try {
        const OC2D = g.OffscreenCanvasRenderingContext2D as
          | { prototype: { getImageData: (x: number, y: number, w: number, h: number) => ImageData } }
          | undefined
        if (OC2D && OC2D.prototype.getImageData) {
          const orig = OC2D.prototype.getImageData
          OC2D.prototype.getImageData = function (this: unknown, x: number, y: number, sw: number, sh: number) {
            const img = orig.call(this, x, y, sw, sh)
            const d = img.data
            let st = (o.seed >>> 0) || 1
            for (let i = 0; i < d.length; i += 4) {
              st ^= st << 13
              st ^= st >>> 17
              st ^= st << 5
              if ((st >>> 0) / 4294967296 < 0.02) d[i] ^= 1
            }
            return img
          }
        }
      } catch {
        void 0
      }
    }
  }

  const appliedRealms = new WeakSet<object>()
  const maskByRealm = new WeakMap<object, (fn: unknown, name: string) => unknown>()

  const applyTo = (w: Window): void => {
    if (!w) return
    try {
      if (appliedRealms.has(w)) return
    } catch {
      return
    }

    const setupMask = () => {
      const existing = maskByRealm.get(w)
      if (existing) return existing
      const Fn = (w as unknown as { Function: FunctionConstructor }).Function
      const natToStr = Fn.prototype.toString
      const map = new (w as unknown as { WeakMap: typeof WeakMap }).WeakMap<object, string>()
      const patched = function toString(this: object): string {
        if (map.has(this)) return map.get(this) as string
        return natToStr.call(this)
      }
      try {
        map.set(patched, 'function toString() { [native code] }')
      } catch {
        void 0
      }
      try {
        Fn.prototype.toString = patched
      } catch {
        void 0
      }
      const mask = (fn: unknown, name: string) => {
        try {
          map.set(fn as object, 'function ' + name + '() { [native code] }')
        } catch {
          void 0
        }
        return fn
      }
      maskByRealm.set(w, mask)
      return mask
    }

    const mask = setupMask() as (fn: unknown, name: string) => unknown

    const define = (host: object, prop: string, value: unknown) => {
      const getter = function () {
        return value
      }
      try {
        Object.defineProperty(getter, 'name', { value: 'get ' + prop })
      } catch {
        void 0
      }
      mask(getter, 'get ' + prop)
      let owner: object | null = host
      while (owner && !Object.getOwnPropertyDescriptor(owner, prop)) {
        owner = Object.getPrototypeOf(owner)
      }
      const targets = owner && owner !== host ? [owner, host] : [host]
      for (const t of targets) {
        try {
          Object.defineProperty(t, prop, {
            get: getter as () => unknown,
            set: undefined,
            configurable: true,
            enumerable: true,
          })
          return
        } catch {
          void 0
        }
      }
    }

    const nav = w.navigator
    const scr = w.screen

    if (opts.languages) {
      define(nav, 'language', p.language)
      define(nav, 'languages', Object.freeze([...p.languages]))
    }
    if (opts.hardware) {
      define(nav, 'hardwareConcurrency', p.hardwareConcurrency)
      define(nav, 'deviceMemory', p.deviceMemory)
    }
    if (opts.touch) {
      define(nav, 'maxTouchPoints', p.maxTouchPoints)
    }
    if (opts.webdriver) {
      define(nav, 'webdriver', false)
    }

    if (opts.userAgent) {
      define(nav, 'userAgent', p.ua)
      define(nav, 'appVersion', p.ua.replace(/^Mozilla\//, ''))
      define(nav, 'platform', p.platform)
      define(nav, 'vendor', p.vendor)
    }

    const highEntropy = {
      platform: p.uaData.platform,
      platformVersion: p.uaData.platformVersion,
      architecture: p.uaData.architecture,
      bitness: p.uaData.bitness,
      model: '',
      uaFullVersion: p.uaData.uaFullVersion,
      fullVersionList: p.uaData.brands.map((b) => ({ ...b })),
      brands: p.uaData.brands.map((b) => ({ ...b })),
      mobile: p.uaData.mobile,
      wow64: false,
    }
    const getHighEntropyValues = function (hints: string[]) {
      const out: Record<string, unknown> = {
        brands: p.uaData.brands.map((b) => ({ ...b })),
        mobile: p.uaData.mobile,
        platform: p.uaData.platform,
      }
      for (const h of hints || []) {
        if (h in highEntropy) out[h] = (highEntropy as Record<string, unknown>)[h]
      }
      return Promise.resolve(out)
    }
    mask(getHighEntropyValues, 'getHighEntropyValues')
    if (opts.userAgent) {
      define(nav, 'userAgentData', {
        brands: p.uaData.brands.map((b) => ({ ...b })),
        mobile: p.uaData.mobile,
        platform: p.uaData.platform,
        getHighEntropyValues,
        toJSON: () => ({
          brands: p.uaData.brands,
          mobile: p.uaData.mobile,
          platform: p.uaData.platform,
        }),
      })
    }

    if (opts.screen) {
      define(w, 'devicePixelRatio', p.devicePixelRatio)
      define(scr, 'width', p.screen.width)
      define(scr, 'height', p.screen.height)
      define(scr, 'availWidth', p.screen.availWidth)
      define(scr, 'availHeight', p.screen.availHeight)
      define(scr, 'colorDepth', p.screen.colorDepth)
      define(scr, 'pixelDepth', p.screen.colorDepth)
      define(w, 'outerWidth', p.screen.availWidth)
      define(w, 'outerHeight', p.screen.availHeight)
      define(w, 'screenX', 0)
      define(w, 'screenY', 0)
      define(scr, 'isExtended', false)
      define(scr, 'availLeft', 0)
      define(scr, 'availTop', 0)
    }

    if (opts.timezone) try {
      const Intl = (w as unknown as { Intl: typeof globalThis.Intl }).Intl
      const OrigDTF = Intl.DateTimeFormat
      const origRO = OrigDTF.prototype.resolvedOptions
      let realLocalTz = ''
      try {
        realLocalTz = origRO.call(new OrigDTF()).timeZone
      } catch {
        void 0
      }
      const patchedRO = function resolvedOptions(this: Intl.DateTimeFormat) {
        const o = origRO.call(this)
        if (!realLocalTz || o.timeZone === realLocalTz) o.timeZone = p.timezone
        return o
      }
      mask(patchedRO, 'resolvedOptions')
      OrigDTF.prototype.resolvedOptions = patchedRO

      const tzOffset = (d: Date) => {
        const parts = new OrigDTF('en-US', {
          timeZone: p.timezone,
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).formatToParts(d)
        const m: Record<string, number> = {}
        for (const x of parts) if (x.type !== 'literal') m[x.type] = parseInt(x.value, 10)
        const asUTC = Date.UTC(m.year, m.month - 1, m.day, m.hour % 24, m.minute, m.second)
        return Math.round((d.getTime() - asUTC) / 60000)
      }
      const DateCtor = (w as unknown as { Date: DateConstructor }).Date
      const patchedOffset = function getTimezoneOffset(this: Date) {
        try {
          return tzOffset(this)
        } catch {
          return 0
        }
      }
      mask(patchedOffset, 'getTimezoneOffset')
      DateCtor.prototype.getTimezoneOffset = patchedOffset

      const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n)
      const wallParts = (d: Date): Record<string, string> => {
        const parts = new OrigDTF('en-US', {
          timeZone: p.timezone,
          hour12: false,
          weekday: 'short',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).formatToParts(d)
        const m: Record<string, string> = {}
        for (const x of parts) m[x.type] = x.value
        return m
      }
      const tzLongName = (d: Date): string => {
        try {
          const parts = new OrigDTF('en-US', {
            timeZone: p.timezone,
            timeZoneName: 'long',
            year: 'numeric',
          }).formatToParts(d)
          const t = parts.find((x) => x.type === 'timeZoneName')
          return t ? t.value : ''
        } catch {
          return ''
        }
      }
      const offStr = (d: Date): string => {
        const off = tzOffset(d)
        const sign = off > 0 ? '-' : '+'
        const abs = Math.abs(off)
        return 'GMT' + sign + pad2(Math.floor(abs / 60)) + pad2(abs % 60)
      }
      const dateStr = (d: Date): string => {
        const m = wallParts(d)
        return m.weekday + ' ' + MO[parseInt(m.month, 10) - 1] + ' ' + m.day + ' ' + m.year
      }
      const timeStr = (d: Date): string => {
        const m = wallParts(d)
        return (
          pad2(parseInt(m.hour, 10) % 24) +
          ':' +
          m.minute +
          ':' +
          m.second +
          ' ' +
          offStr(d) +
          ' (' +
          tzLongName(d) +
          ')'
        )
      }

      const proto = DateCtor.prototype as unknown as Record<string, (...a: unknown[]) => unknown>
      const setStr = (name: string, fn: (this: Date) => string) => {
        mask(fn, name)
        proto[name] = fn as (...a: unknown[]) => unknown
      }
      setStr('toString', function (this: Date) {
        if (isNaN(this.getTime())) return 'Invalid Date'
        return dateStr(this) + ' ' + timeStr(this)
      })
      setStr('toDateString', function (this: Date) {
        return isNaN(this.getTime()) ? 'Invalid Date' : dateStr(this)
      })
      setStr('toTimeString', function (this: Date) {
        return isNaN(this.getTime()) ? 'Invalid Date' : timeStr(this)
      })

      const patchLocale = (name: string) => {
        const orig = proto[name]
        if (typeof orig !== 'function') return
        const patched = function (this: Date, locales: unknown, options: Record<string, unknown>) {
          const o = options ? { ...options } : {}
          if (!o.timeZone) o.timeZone = p.timezone
          return orig.call(this, locales, o)
        }
        mask(patched, name)
        proto[name] = patched as (...a: unknown[]) => unknown
      }
      patchLocale('toLocaleString')
      patchLocale('toLocaleDateString')
      patchLocale('toLocaleTimeString')
    } catch {
      void 0
    }

    if (opts.webgl) try {
      const wgl = (w as unknown as { WebGLRenderingContext?: { prototype: { getParameter: (n: number) => unknown } } })
        .WebGLRenderingContext
      const wgl2 = (w as unknown as { WebGL2RenderingContext?: { prototype: { getParameter: (n: number) => unknown } } })
        .WebGL2RenderingContext
      const patchGetParameter = (proto: { getParameter: (n: number) => unknown } | undefined) => {
        if (!proto) return
        const orig = proto.getParameter
        const patched = function (this: unknown, param: number) {
          if (param === 0x9245) return p.webgl.vendor
          if (param === 0x9246) return p.webgl.renderer
          return orig.call(this, param)
        }
        mask(patched, 'getParameter')
        proto.getParameter = patched
      }
      patchGetParameter(wgl ? wgl.prototype : undefined)
      patchGetParameter(wgl2 ? wgl2.prototype : undefined)

      const mobile = p.uaData.mobile
      const exts1 = mobile
        ? ['ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_half_float', 'EXT_disjoint_timer_query', 'EXT_float_blend', 'EXT_frag_depth', 'EXT_shader_texture_lod', 'EXT_texture_filter_anisotropic', 'OES_element_index_uint', 'OES_fbo_render_mipmap', 'OES_standard_derivatives', 'OES_texture_float', 'OES_texture_float_linear', 'OES_texture_half_float', 'OES_texture_half_float_linear', 'OES_vertex_array_object', 'WEBGL_color_buffer_float', 'WEBGL_compressed_texture_astc', 'WEBGL_compressed_texture_etc', 'WEBGL_compressed_texture_etc1', 'WEBGL_debug_renderer_info', 'WEBGL_debug_shaders', 'WEBGL_depth_texture', 'WEBGL_draw_buffers', 'WEBGL_lose_context', 'WEBGL_multi_draw']
        : ['ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_clip_control', 'EXT_color_buffer_half_float', 'EXT_depth_clamp', 'EXT_disjoint_timer_query', 'EXT_float_blend', 'EXT_frag_depth', 'EXT_polygon_offset_clamp', 'EXT_shader_texture_lod', 'EXT_texture_compression_bptc', 'EXT_texture_compression_rgtc', 'EXT_texture_filter_anisotropic', 'EXT_texture_mirror_clamp_to_edge', 'EXT_sRGB', 'KHR_parallel_shader_compile', 'OES_element_index_uint', 'OES_fbo_render_mipmap', 'OES_standard_derivatives', 'OES_texture_float', 'OES_texture_float_linear', 'OES_texture_half_float', 'OES_texture_half_float_linear', 'OES_vertex_array_object', 'WEBGL_blend_func_extended', 'WEBGL_color_buffer_float', 'WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb', 'WEBGL_debug_renderer_info', 'WEBGL_debug_shaders', 'WEBGL_depth_texture', 'WEBGL_draw_buffers', 'WEBGL_lose_context', 'WEBGL_multi_draw', 'WEBGL_polygon_mode']
      const exts2 = mobile
        ? ['EXT_color_buffer_float', 'EXT_color_buffer_half_float', 'EXT_disjoint_timer_query_webgl2', 'EXT_float_blend', 'EXT_texture_filter_anisotropic', 'EXT_texture_norm16', 'KHR_parallel_shader_compile', 'OES_draw_buffers_indexed', 'OES_texture_float_linear', 'OVR_multiview2', 'WEBGL_compressed_texture_astc', 'WEBGL_compressed_texture_etc', 'WEBGL_compressed_texture_etc1', 'WEBGL_debug_renderer_info', 'WEBGL_debug_shaders', 'WEBGL_lose_context', 'WEBGL_multi_draw']
        : ['EXT_clip_control', 'EXT_color_buffer_float', 'EXT_color_buffer_half_float', 'EXT_depth_clamp', 'EXT_disjoint_timer_query_webgl2', 'EXT_float_blend', 'EXT_polygon_offset_clamp', 'EXT_texture_compression_bptc', 'EXT_texture_compression_rgtc', 'EXT_texture_filter_anisotropic', 'EXT_texture_mirror_clamp_to_edge', 'EXT_texture_norm16', 'KHR_parallel_shader_compile', 'OES_draw_buffers_indexed', 'OES_texture_float_linear', 'OVR_multiview2', 'WEBGL_blend_func_extended', 'WEBGL_clip_cull_distance', 'WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb', 'WEBGL_debug_renderer_info', 'WEBGL_debug_shaders', 'WEBGL_lose_context', 'WEBGL_multi_draw', 'WEBGL_provoking_vertex']

      const patchExtra = (
        proto: { getSupportedExtensions?: unknown; getShaderPrecisionFormat?: unknown } | undefined,
        list: string[],
      ) => {
        if (!proto) return
        if (typeof proto.getSupportedExtensions === 'function') {
          const ext = function () {
            return list.slice()
          }
          mask(ext, 'getSupportedExtensions')
          proto.getSupportedExtensions = ext
        }
        if (typeof proto.getShaderPrecisionFormat === 'function') {
          const spf = function (this: unknown, _shaderType: number, precisionType: number) {
            const isInt = precisionType >= 0x8df3 && precisionType <= 0x8df5
            return isInt
              ? { rangeMin: 31, rangeMax: 30, precision: 0 }
              : { rangeMin: 127, rangeMax: 127, precision: 23 }
          }
          mask(spf, 'getShaderPrecisionFormat')
          proto.getShaderPrecisionFormat = spf
        }
      }
      patchExtra(wgl ? (wgl.prototype as never) : undefined, exts1)
      patchExtra(wgl2 ? (wgl2.prototype as never) : undefined, exts2)
    } catch {
      void 0
    }

    if (opts.canvas) {
      try {
        const C2D = (w as unknown as { CanvasRenderingContext2D?: { prototype: CanvasRenderingContext2D } })
          .CanvasRenderingContext2D
        const HC = (w as unknown as { HTMLCanvasElement?: { prototype: HTMLCanvasElement } }).HTMLCanvasElement
        const proto2d = C2D ? C2D.prototype : null
        const origGetImageData = proto2d ? proto2d.getImageData : null

        const perturb = (pixels: Uint8ClampedArray) => {
          const r = makeRng(opts.seed)
          for (let i = 0; i < pixels.length; i += 4) {
            if (r() < 0.02) pixels[i] ^= 1
          }
        }

        if (proto2d && origGetImageData) {
          const patched = function (
            this: CanvasRenderingContext2D,
            x: number,
            y: number,
            sw: number,
            sh: number,
          ) {
            const img = origGetImageData.call(this, x, y, sw, sh)
            perturb(img.data)
            return img
          }
          mask(patched, 'getImageData')
          proto2d.getImageData = patched as typeof proto2d.getImageData
        }

        if (HC && origGetImageData) {
          const hcProto = HC.prototype
          const origToDataURL = hcProto.toDataURL
          const patched = function (this: HTMLCanvasElement, ...args: unknown[]) {
            try {
              const cw = this.width
              const ch = this.height
              if (cw && ch) {
                const copy = w.document.createElement('canvas')
                copy.width = cw
                copy.height = ch
                const cctx = copy.getContext('2d')
                if (cctx) {
                  cctx.drawImage(this, 0, 0)
                  const img = origGetImageData.call(cctx, 0, 0, cw, ch)
                  perturb(img.data)
                  cctx.putImageData(img, 0, 0)
                  return origToDataURL.apply(copy, args as [])
                }
              }
            } catch {
              void 0
            }
            return origToDataURL.apply(this, args as [])
          }
          mask(patched, 'toDataURL')
          hcProto.toDataURL = patched as typeof hcProto.toDataURL
        }

        const OC2D = (w as unknown as {
          OffscreenCanvasRenderingContext2D?: { prototype: { getImageData: (...a: unknown[]) => ImageData } }
        }).OffscreenCanvasRenderingContext2D
        const ocProto = OC2D ? OC2D.prototype : null
        const origOcGetImageData = ocProto ? ocProto.getImageData : null
        if (ocProto && origOcGetImageData) {
          const patched = function (this: unknown, x: number, y: number, sw: number, sh: number) {
            const img = origOcGetImageData.call(this, x, y, sw, sh)
            perturb(img.data)
            return img
          }
          mask(patched, 'getImageData')
          ocProto.getImageData = patched as typeof ocProto.getImageData
        }

        const OC = (w as unknown as { OffscreenCanvas?: { prototype: OffscreenCanvas } }).OffscreenCanvas
        if (OC && origOcGetImageData && (OC.prototype as { convertToBlob?: unknown }).convertToBlob) {
          const ocp = OC.prototype
          const origConvert = ocp.convertToBlob
          const patched = function (this: OffscreenCanvas, ...args: unknown[]) {
            try {
              const cw = this.width
              const ch = this.height
              if (cw && ch) {
                const copy = new (w as unknown as { OffscreenCanvas: typeof OffscreenCanvas }).OffscreenCanvas(
                  cw,
                  ch,
                )
                const cctx = copy.getContext('2d') as OffscreenCanvasRenderingContext2D | null
                if (cctx) {
                  cctx.drawImage(this as unknown as CanvasImageSource, 0, 0)
                  const img = origOcGetImageData.call(cctx, 0, 0, cw, ch)
                  perturb(img.data)
                  cctx.putImageData(img, 0, 0)
                  return origConvert.apply(copy, args as [])
                }
              }
            } catch {
              void 0
            }
            return origConvert.apply(this, args as [])
          }
          mask(patched, 'convertToBlob')
          ocp.convertToBlob = patched as typeof ocp.convertToBlob
        }
      } catch {
        void 0
      }
    }

    if (opts.audio) {
      try {
        const AB = (w as unknown as { AudioBuffer?: { prototype: AudioBuffer } }).AudioBuffer
        const proto = AB ? AB.prototype : null
        if (proto && proto.getChannelData) {
          const orig = proto.getChannelData
          const patched = function (this: AudioBuffer, channel: number) {
            const arr = orig.call(this, channel)
            const r = makeRng((opts.seed ^ 0x9e3779b9) >>> 0)
            for (let i = 0; i < arr.length; i += 100) {
              arr[i] = arr[i] + (r() - 0.5) * 1e-7
            }
            return arr
          }
          mask(patched, 'getChannelData')
          proto.getChannelData = patched as typeof proto.getChannelData
        }

        const AN = (w as unknown as { AnalyserNode?: { prototype: object } }).AnalyserNode
        const anProto = AN ? (AN.prototype as Record<string, unknown>) : null
        if (anProto) {
          type Arr = { length: number; [i: number]: number }
          const wrap = (name: string, salt: number, step: number, mut: (a: Arr, i: number, r: () => number) => void) => {
            const orig = anProto[name]
            if (typeof orig !== 'function') return
            const fn = orig as (a: Arr) => void
            const patched = function (this: unknown, arr: Arr) {
              fn.call(this, arr)
              const r = makeRng((opts.seed ^ salt) >>> 0)
              for (let i = 0; i < arr.length; i += step) mut(arr, i, r)
            }
            mask(patched, name)
            anProto[name] = patched
          }
          wrap('getFloatFrequencyData', 0x5bd1e995, 30, (a, i, r) => {
            a[i] = a[i] + (r() - 0.5) * 1e-4
          })
          wrap('getFloatTimeDomainData', 0x5bd1e995, 30, (a, i, r) => {
            a[i] = a[i] + (r() - 0.5) * 1e-4
          })
          wrap('getByteFrequencyData', 0x27d4eb2f, 50, (a, i, r) => {
            if (r() < 0.5 && a[i] > 0) a[i] = a[i] - 1
          })
          wrap('getByteTimeDomainData', 0x27d4eb2f, 50, (a, i, r) => {
            if (r() < 0.5 && a[i] > 0) a[i] = a[i] - 1
          })
        }
      } catch {
        void 0
      }
    }

    if (opts.fonts) {
      try {
        let base = opts.seed >>> 0 || 1
        const host = (w.location && w.location.hostname) || ''
        for (let i = 0; i < host.length; i++) base = (Math.imul(base, 31) + host.charCodeAt(i)) >>> 0
        const noise = (a: number, b: number) => {
          let h = (base ^ (a >>> 0) ^ Math.imul(b >>> 0, 2654435761)) >>> 0
          h ^= h << 13
          h ^= h >>> 17
          h ^= h << 5
          return (h >>> 0) / 4294967296
        }
        const strKey = (s: string) => {
          let h = base
          for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0
          return h >>> 0
        }

        const dim = (a: number, b: number) => (noise((a * 100) | 0, b) - 0.5) * 0.4

        const Elem = (w as unknown as { Element?: { prototype: Element } }).Element
        const DOMRectCtor = (w as unknown as { DOMRect?: typeof DOMRect }).DOMRect
        if (Elem && DOMRectCtor && Elem.prototype.getBoundingClientRect) {
          const orig = Elem.prototype.getBoundingClientRect
          const patched = function (this: Element) {
            const r = orig.call(this)
            if (!r.width && !r.height) return r
            const dw = dim(r.width, 1)
            const dh = dim(r.height, 2)
            return new DOMRectCtor(r.x, r.y, r.width + dw, r.height + dh)
          }
          mask(patched, 'getBoundingClientRect')
          Elem.prototype.getBoundingClientRect = patched as typeof Elem.prototype.getBoundingClientRect
        }

        const C2D = (w as unknown as { CanvasRenderingContext2D?: { prototype: CanvasRenderingContext2D } })
          .CanvasRenderingContext2D
        if (C2D && C2D.prototype.measureText) {
          const orig = C2D.prototype.measureText
          const fields = [
            'width',
            'actualBoundingBoxLeft',
            'actualBoundingBoxRight',
            'actualBoundingBoxAscent',
            'actualBoundingBoxDescent',
          ]
          const patched = function (this: CanvasRenderingContext2D, text: string) {
            const m = orig.call(this, text)
            const key = strKey(String(text) + '|' + (this.font || ''))
            const out: Record<string, number> = {}
            for (const f of fields) {
              const val = (m as unknown as Record<string, number>)[f]
              if (typeof val === 'number') out[f] = val + (noise(key, f.length) - 0.5) * 0.4
            }
            return out as unknown as TextMetrics
          }
          mask(patched, 'measureText')
          C2D.prototype.measureText = patched as typeof C2D.prototype.measureText
        }
      } catch {
        void 0
      }
    }

    if (opts.plugins) {
      try {
        const mkMime = (type: string) => ({
          type,
          suffixes: 'pdf',
          description: 'Portable Document Format',
          enabledPlugin: null as unknown,
        })
        const mimeList = p.uaData.mobile ? [] : [mkMime('application/pdf'), mkMime('text/pdf')]
        const pluginNames = p.uaData.mobile
          ? []
          : [
              'PDF Viewer',
              'Chrome PDF Viewer',
              'Chromium PDF Viewer',
              'Microsoft Edge PDF Viewer',
              'WebKit built-in PDF',
            ]

        const makeArrayLike = (items: Record<string, unknown>[], nameKey: string) => {
          const arr: Record<string, unknown> = {
            length: items.length,
            item(i: number) {
              return items[i] ?? null
            },
            namedItem(name: string) {
              return items.find((it) => it[nameKey] === name) ?? null
            },
            refresh() {
              void 0
            },
            [Symbol.iterator]() {
              return items[Symbol.iterator]()
            },
          }
          items.forEach((it, i) => {
            arr[i] = it
            arr[it[nameKey] as string] = it
          })
          return arr
        }

        const mimeArray = makeArrayLike(mimeList, 'type')
        const plugins = pluginNames.map((name) => {
          const plugin = makeArrayLike([...mimeList], 'type')
          plugin.name = name
          plugin.filename = 'internal-pdf-viewer'
          plugin.description = 'Portable Document Format'
          return plugin
        })
        const pluginArray = makeArrayLike(plugins, 'name')
        mimeList.forEach((m) => {
          m.enabledPlugin = plugins[0] ?? null
        })

        define(nav, 'plugins', pluginArray)
        define(nav, 'mimeTypes', mimeArray)
      } catch {
        void 0
      }
    }

    if (opts.mediaDevices) {
      try {
        const md = (nav as unknown as { mediaDevices?: { enumerateDevices?: unknown } }).mediaDevices
        if (md && md.enumerateDevices) {
          const fake = [
            { kind: 'audioinput', label: '', deviceId: '', groupId: '' },
            { kind: 'videoinput', label: '', deviceId: '', groupId: '' },
            { kind: 'audiooutput', label: '', deviceId: '', groupId: '' },
          ]
          const patched = function enumerateDevices() {
            return Promise.resolve(fake.map((d) => ({ ...d, toJSON: () => d })))
          }
          mask(patched, 'enumerateDevices')
          const proto = Object.getPrototypeOf(md)
          try {
            Object.defineProperty(proto, 'enumerateDevices', {
              value: patched,
              configurable: true,
              writable: true,
            })
          } catch {
            ;(md as { enumerateDevices: unknown }).enumerateDevices = patched
          }
        }
      } catch {
        void 0
      }
    }

    if (opts.connection) {
      try {
        const conn = {
          effectiveType: '4g',
          rtt: p.uaData.mobile ? 100 : 50,
          downlink: p.uaData.mobile ? 5 : 10,
          saveData: false,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }
        define(nav, 'connection', conn)
      } catch {
        void 0
      }
    }

    if (opts.speech) {
      try {
        const synth = (w as unknown as { speechSynthesis?: { getVoices?: unknown } }).speechSynthesis
        if (synth && synth.getVoices) {
          const voices = [
            { voiceURI: 'Google US English', name: 'Google US English', lang: 'en-US', localService: false, default: true },
            { voiceURI: 'Google UK English Female', name: 'Google UK English Female', lang: 'en-GB', localService: false, default: false },
            { voiceURI: 'Google UK English Male', name: 'Google UK English Male', lang: 'en-GB', localService: false, default: false },
            { voiceURI: 'Google español', name: 'Google español', lang: 'es-ES', localService: false, default: false },
            { voiceURI: 'Google français', name: 'Google français', lang: 'fr-FR', localService: false, default: false },
            { voiceURI: 'Google Deutsch', name: 'Google Deutsch', lang: 'de-DE', localService: false, default: false },
            { voiceURI: 'Google 日本語', name: 'Google 日本語', lang: 'ja-JP', localService: false, default: false },
            { voiceURI: 'Google 한국의', name: 'Google 한국의', lang: 'ko-KR', localService: false, default: false },
            { voiceURI: 'Google 普通话（中国大陆）', name: 'Google 普通话（中国大陆）', lang: 'zh-CN', localService: false, default: false },
          ]
          const patched = function getVoices() {
            return voices.map((v) => ({ ...v }))
          }
          mask(patched, 'getVoices')
          const proto = Object.getPrototypeOf(synth)
          try {
            Object.defineProperty(proto, 'getVoices', { value: patched, configurable: true, writable: true })
          } catch {
            ;(synth as { getVoices: unknown }).getVoices = patched
          }
        }
      } catch {
        void 0
      }
    }

    if (opts.storage) {
      try {
        const st = (nav as unknown as { storage?: { estimate?: unknown } }).storage
        if (st && st.estimate) {
          const patched = function estimate() {
            return Promise.resolve({ quota: 299977418240, usage: 0, usageDetails: {} })
          }
          mask(patched, 'estimate')
          const proto = Object.getPrototypeOf(st)
          try {
            Object.defineProperty(proto, 'estimate', { value: patched, configurable: true, writable: true })
          } catch {
            ;(st as { estimate: unknown }).estimate = patched
          }
        }
      } catch {
        void 0
      }
    }

    if (opts.keyboard) {
      try {
        const kb = (nav as unknown as { keyboard?: { getLayoutMap?: unknown } }).keyboard
        if (kb && kb.getLayoutMap) {
          const layout: [string, string][] = [
            ['KeyA', 'a'], ['KeyB', 'b'], ['KeyC', 'c'], ['KeyD', 'd'], ['KeyE', 'e'],
            ['KeyF', 'f'], ['KeyG', 'g'], ['KeyH', 'h'], ['KeyI', 'i'], ['KeyJ', 'j'],
            ['KeyK', 'k'], ['KeyL', 'l'], ['KeyM', 'm'], ['KeyN', 'n'], ['KeyO', 'o'],
            ['KeyP', 'p'], ['KeyQ', 'q'], ['KeyR', 'r'], ['KeyS', 's'], ['KeyT', 't'],
            ['KeyU', 'u'], ['KeyV', 'v'], ['KeyW', 'w'], ['KeyX', 'x'], ['KeyY', 'y'],
            ['KeyZ', 'z'], ['Digit0', '0'], ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'],
            ['Digit4', '4'], ['Digit5', '5'], ['Digit6', '6'], ['Digit7', '7'], ['Digit8', '8'],
            ['Digit9', '9'], ['Minus', '-'], ['Equal', '='], ['BracketLeft', '['],
            ['BracketRight', ']'], ['Backslash', '\\'], ['Semicolon', ';'], ['Quote', "'"],
            ['Backquote', '`'], ['Comma', ','], ['Period', '.'], ['Slash', '/'],
          ]
          const patched = function getLayoutMap() {
            return Promise.resolve(new Map(layout))
          }
          mask(patched, 'getLayoutMap')
          const proto = Object.getPrototypeOf(kb)
          try {
            Object.defineProperty(proto, 'getLayoutMap', { value: patched, configurable: true, writable: true })
          } catch {
            ;(kb as { getLayoutMap: unknown }).getLayoutMap = patched
          }
        }
      } catch {
        void 0
      }
    }

    if (opts.webgpu) {
      try {
        const gpu = (nav as unknown as {
          gpu?: { requestAdapter?: (...a: unknown[]) => Promise<unknown> }
        }).gpu
        if (gpu && gpu.requestAdapter) {
          const vlow = p.webgl.vendor.toLowerCase()
          const vendor = vlow.includes('nvidia')
            ? 'nvidia'
            : vlow.includes('apple')
              ? 'apple'
              : vlow.includes('qualcomm')
                ? 'qualcomm'
                : vlow.includes('intel')
                  ? 'intel'
                  : vlow.includes('amd')
                    ? 'amd'
                    : ''
          const info = { vendor, architecture: '', device: '', description: '' }
          const origRA = gpu.requestAdapter
          const patched = function requestAdapter(this: unknown, ...args: unknown[]) {
            return origRA.apply(this, args).then((adapter: unknown) => {
              if (adapter) {
                try {
                  Object.defineProperty(adapter, 'info', { get: () => ({ ...info }), configurable: true })
                } catch {
                  void 0
                }
                const a = adapter as { requestAdapterInfo?: unknown }
                if (a.requestAdapterInfo) {
                  const rai = function requestAdapterInfo() {
                    return Promise.resolve({ ...info })
                  }
                  mask(rai, 'requestAdapterInfo')
                  try {
                    a.requestAdapterInfo = rai
                  } catch {
                    void 0
                  }
                }
              }
              return adapter
            })
          }
          mask(patched, 'requestAdapter')
          const proto = Object.getPrototypeOf(gpu)
          try {
            Object.defineProperty(proto, 'requestAdapter', { value: patched, configurable: true, writable: true })
          } catch {
            ;(gpu as { requestAdapter: unknown }).requestAdapter = patched
          }
        }
      } catch {
        void 0
      }
    }

    if (opts.battery) {
      try {
        const navB = nav as unknown as { getBattery?: unknown }
        if (typeof navB.getBattery === 'function') {
          const battery = {
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1,
            onchargingchange: null,
            onchargingtimechange: null,
            ondischargingtimechange: null,
            onlevelchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
          }
          const patched = function getBattery() {
            return Promise.resolve(battery)
          }
          mask(patched, 'getBattery')
          let proto: object | null = nav
          while (proto && !Object.getOwnPropertyDescriptor(proto, 'getBattery')) {
            proto = Object.getPrototypeOf(proto)
          }
          try {
            Object.defineProperty(proto ?? nav, 'getBattery', {
              value: patched,
              configurable: true,
              writable: true,
            })
          } catch {
            navB.getBattery = patched
          }
        }
      } catch {
        void 0
      }
    }

    if (opts.iframes) try {
      const IF = (w as unknown as { HTMLIFrameElement?: { prototype: HTMLIFrameElement } }).HTMLIFrameElement
      const ifProto = IF ? IF.prototype : null
      if (ifProto) {
        const cwDesc = Object.getOwnPropertyDescriptor(ifProto, 'contentWindow')
        if (cwDesc && cwDesc.get) {
          const origGet = cwDesc.get
          const patched = function (this: HTMLIFrameElement) {
            const childWin = origGet.call(this) as Window | null
            try {
              if (childWin) applyTo(childWin)
            } catch {
              void 0
            }
            return childWin
          }
          mask(patched, 'get contentWindow')
          Object.defineProperty(ifProto, 'contentWindow', {
            get: patched,
            configurable: true,
            enumerable: true,
          })
        }
        const cdDesc = Object.getOwnPropertyDescriptor(ifProto, 'contentDocument')
        if (cdDesc && cdDesc.get) {
          const origGet = cdDesc.get
          const patched = function (this: HTMLIFrameElement) {
            const doc = origGet.call(this) as Document | null
            try {
              if (doc && doc.defaultView) applyTo(doc.defaultView)
            } catch {
              void 0
            }
            return doc
          }
          mask(patched, 'get contentDocument')
          Object.defineProperty(ifProto, 'contentDocument', {
            get: patched,
            configurable: true,
            enumerable: true,
          })
        }
      }
    } catch {
      void 0
    }

    if (opts.workers) {
      try {
        const OrigWorker = (w as unknown as { Worker?: typeof Worker }).Worker
        if (OrigWorker) {
          const prelude =
            '(' + workerSpoof.toString() + ')(' + JSON.stringify(p) + ',' + JSON.stringify(opts) + ');'
          const WURL = (w as unknown as { URL: typeof URL }).URL
          const NewWorker = function (this: unknown, url: string | URL, options?: WorkerOptions) {
            try {
              const abs = new WURL(url as string, w.location.href).href
              const isModule = !!(options && options.type === 'module')
              const body = isModule
                ? prelude + 'import(' + JSON.stringify(abs) + ');'
                : prelude + 'importScripts(' + JSON.stringify(abs) + ');'
              const blob = new (w as unknown as { Blob: typeof Blob }).Blob([body], {
                type: 'text/javascript',
              })
              const blobUrl = WURL.createObjectURL(blob)
              return new OrigWorker(blobUrl, options)
            } catch {
              return new OrigWorker(url, options)
            }
          } as unknown as typeof Worker
          NewWorker.prototype = OrigWorker.prototype
          mask(NewWorker, 'Worker')
          ;(w as unknown as { Worker: typeof Worker }).Worker = NewWorker
        }
      } catch {
        void 0
      }
    }

    try {
      appliedRealms.add(w)
    } catch {
      void 0
    }
  }

  applyTo(root)
}
