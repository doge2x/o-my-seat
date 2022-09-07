// ==UserScript==
// @name         o-my-seat
// @version      0.0.0
// @author       doge2x
// @namespace    https://github.com/doge2x/o-my-seat
// @match        http://csyy.qdu.edu.cn:8080/clientweb/xcus/ic2/Default.aspx
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
(function(factory) {
  typeof define === "function" && define.amd ? define(factory) : factory();
})(function() {
  "use strict";
  const sharedConfig = {};
  const equalFn = (a, b) => a === b;
  const $PROXY = Symbol("solid-proxy");
  const $TRACK = Symbol("solid-track");
  const $DEVCOMP = Symbol("solid-dev-component");
  const signalOptions = {
    equals: equalFn
  };
  let runEffects = runQueue;
  const STALE = 1;
  const PENDING = 2;
  const UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var Owner = null;
  let Transition = null;
  let Listener = null;
  let Updates = null;
  let Effects = null;
  let ExecCount = 0;
  let rootCount = 0;
  function createRoot(fn, detachedOwner) {
    const listener = Listener, owner = Owner, unowned = fn.length === 0, root = unowned && false ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: null,
      owner: detachedOwner || owner
    }, updateFn = unowned ? () => fn(() => {
      throw new Error("Dispose method must be an explicit argument to createRoot function");
    }) : () => fn(() => untrack(() => cleanNode(root)));
    {
      if (owner)
        root.name = `${owner.name}-r${rootCount++}`;
      globalThis._$afterCreateRoot && globalThis._$afterCreateRoot(root);
    }
    Owner = root;
    Listener = null;
    try {
      return runUpdates(updateFn, true);
    } finally {
      Listener = listener;
      Owner = owner;
    }
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      comparator: options.equals || void 0
    };
    if (!options.internal)
      s.name = registerGraph(options.name || hashValue(value), s);
    const setter = (value2) => {
      if (typeof value2 === "function") {
        value2 = value2(s.value);
      }
      return writeSignal(s, value2);
    };
    return [readSignal.bind(s), setter];
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE, options);
    updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const c = createComputation(fn, value, true, 0, options);
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || void 0;
    updateComputation(c);
    return readSignal.bind(c);
  }
  function batch(fn) {
    return runUpdates(fn, false);
  }
  function untrack(fn) {
    let result, listener = Listener;
    Listener = null;
    result = fn();
    Listener = listener;
    return result;
  }
  function onCleanup(fn) {
    if (Owner === null)
      console.warn("cleanups created outside a `createRoot` or `render` will never be run");
    else if (Owner.cleanups === null)
      Owner.cleanups = [fn];
    else
      Owner.cleanups.push(fn);
    return fn;
  }
  function getListener() {
    return Listener;
  }
  function devComponent(Comp, props) {
    const c = createComputation(() => untrack(() => {
      Object.assign(Comp, {
        [$DEVCOMP]: true
      });
      return Comp(props);
    }), void 0, true);
    c.observers = null;
    c.observerSlots = null;
    c.state = 0;
    c.componentName = Comp.name;
    updateComputation(c);
    return c.tValue !== void 0 ? c.tValue : c.value;
  }
  function hashValue(v) {
    const s = /* @__PURE__ */ new Set();
    return `s${typeof v === "string" ? hash(v) : hash(untrack(() => JSON.stringify(v, (k, v2) => {
      if (typeof v2 === "object" && v2 != null) {
        if (s.has(v2))
          return;
        s.add(v2);
        const keys = Object.keys(v2);
        const desc = Object.getOwnPropertyDescriptors(v2);
        const newDesc = keys.reduce((memo, key) => {
          const value = desc[key];
          if (!value.get)
            memo[key] = value;
          return memo;
        }, {});
        v2 = Object.create({}, newDesc);
      }
      if (typeof v2 === "bigint") {
        return `${v2.toString()}n`;
      }
      return v2;
    }) || ""))}`;
  }
  function registerGraph(name, value) {
    let tryName = name;
    if (Owner) {
      let i = 0;
      Owner.sourceMap || (Owner.sourceMap = {});
      while (Owner.sourceMap[tryName])
        tryName = `${name}-${++i}`;
      Owner.sourceMap[tryName] = value;
    }
    return tryName;
  }
  function serializeGraph(owner) {
    owner || (owner = Owner);
    if (!owner)
      return {};
    return {
      ...serializeValues(owner.sourceMap),
      ...owner.owned ? serializeChildren(owner) : {}
    };
  }
  function children(fn) {
    const children2 = createMemo(fn);
    const memo = createMemo(() => resolveChildren(children2()));
    memo.toArray = () => {
      const c = memo();
      return Array.isArray(c) ? c : c != null ? [c] : [];
    };
    return memo;
  }
  function readSignal() {
    const runningTransition = Transition;
    if (this.sources && (this.state || runningTransition)) {
      if (this.state === STALE || runningTransition)
        updateComputation(this);
      else {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(this), false);
        Updates = updates;
      }
    }
    if (Listener) {
      const sSlot = this.observers ? this.observers.length : 0;
      if (!Listener.sources) {
        Listener.sources = [this];
        Listener.sourceSlots = [sSlot];
      } else {
        Listener.sources.push(this);
        Listener.sourceSlots.push(sSlot);
      }
      if (!this.observers) {
        this.observers = [Listener];
        this.observerSlots = [Listener.sources.length - 1];
      } else {
        this.observers.push(Listener);
        this.observerSlots.push(Listener.sources.length - 1);
      }
    }
    return this.value;
  }
  function writeSignal(node, value, isComp) {
    let current = node.value;
    if (!node.comparator || !node.comparator(current, value)) {
      node.value = value;
      if (node.observers && node.observers.length) {
        runUpdates(() => {
          for (let i = 0; i < node.observers.length; i += 1) {
            const o = node.observers[i];
            const TransitionRunning = Transition && Transition.running;
            if (TransitionRunning && Transition.disposed.has(o))
              ;
            if (TransitionRunning && !o.tState || !TransitionRunning && !o.state) {
              if (o.pure)
                Updates.push(o);
              else
                Effects.push(o);
              if (o.observers)
                markDownstream(o);
            }
            if (TransitionRunning)
              ;
            else
              o.state = STALE;
          }
          if (Updates.length > 1e6) {
            Updates = [];
            if ("_SOLID_DEV_")
              throw new Error("Potential Infinite Loop Detected.");
            throw new Error();
          }
        }, false);
      }
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn)
      return;
    cleanNode(node);
    const owner = Owner, listener = Listener, time = ExecCount;
    Listener = Owner = node;
    runComputation(node, node.value, time);
    Listener = listener;
    Owner = owner;
  }
  function runComputation(node, value, time) {
    let nextValue;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      if (node.pure)
        node.state = STALE;
      handleError(err);
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.updatedAt != null && "observers" in node) {
        writeSignal(node, nextValue);
      } else
        node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation(fn, init, pure, state2 = STALE, options) {
    const c = {
      fn,
      state: state2,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: null,
      pure
    };
    if (Owner === null)
      console.warn("computations created outside a `createRoot` or `render` will never be disposed");
    else if (Owner !== UNOWNED) {
      {
        if (!Owner.owned)
          Owner.owned = [c];
        else
          Owner.owned.push(c);
      }
      c.name = options && options.name || `${Owner.name || "c"}-${(Owner.owned || Owner.tOwned).length}`;
    }
    return c;
  }
  function runTop(node) {
    const runningTransition = Transition;
    if (node.state === 0 || runningTransition)
      return;
    if (node.state === PENDING || runningTransition)
      return lookUpstream(node);
    if (node.suspense && untrack(node.suspense.inFallback))
      return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
      if (node.state || runningTransition)
        ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (node.state === STALE || runningTransition) {
        updateComputation(node);
      } else if (node.state === PENDING || runningTransition) {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(node, ancestors[0]), false);
        Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates)
      return fn();
    let wait = false;
    if (!init)
      Updates = [];
    if (Effects)
      wait = true;
    else
      Effects = [];
    ExecCount++;
    try {
      const res = fn();
      completeUpdates(wait);
      return res;
    } catch (err) {
      if (!Updates)
        Effects = null;
      handleError(err);
    }
  }
  function completeUpdates(wait) {
    if (Updates) {
      runQueue(Updates);
      Updates = null;
    }
    if (wait)
      return;
    const e = Effects;
    Effects = null;
    if (e.length)
      runUpdates(() => runEffects(e), false);
    else
      globalThis._$afterUpdate && globalThis._$afterUpdate();
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++)
      runTop(queue[i]);
  }
  function lookUpstream(node, ignore) {
    const runningTransition = Transition;
    node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        if (source.state === STALE || runningTransition) {
          if (source !== ignore)
            runTop(source);
        } else if (source.state === PENDING || runningTransition)
          lookUpstream(source, ignore);
      }
    }
  }
  function markDownstream(node) {
    const runningTransition = Transition;
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (!o.state || runningTransition) {
        o.state = PENDING;
        if (o.pure)
          Updates.push(o);
        else
          Effects.push(o);
        o.observers && markDownstream(o);
      }
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources) {
      while (node.sources.length) {
        const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
        if (obs && obs.length) {
          const n = obs.pop(), s = source.observerSlots.pop();
          if (index < obs.length) {
            n.sourceSlots[s] = index;
            obs[index] = n;
            source.observerSlots[index] = s;
          }
        }
      }
    }
    if (node.owned) {
      for (i = 0; i < node.owned.length; i++)
        cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = 0; i < node.cleanups.length; i++)
        node.cleanups[i]();
      node.cleanups = null;
    }
    node.state = 0;
    node.context = null;
    delete node.sourceMap;
  }
  function castError(err) {
    if (err instanceof Error || typeof err === "string")
      return err;
    return new Error("Unknown error");
  }
  function handleError(err) {
    err = castError(err);
    throw err;
  }
  function resolveChildren(children2) {
    if (typeof children2 === "function" && !children2.length)
      return resolveChildren(children2());
    if (Array.isArray(children2)) {
      const results = [];
      for (let i = 0; i < children2.length; i++) {
        const result = resolveChildren(children2[i]);
        Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
      }
      return results;
    }
    return children2;
  }
  function hash(s) {
    for (var i = 0, h = 9; i < s.length; )
      h = Math.imul(h ^ s.charCodeAt(i++), 9 ** 9);
    return `${h ^ h >>> 9}`;
  }
  function serializeValues(sources = {}) {
    const k = Object.keys(sources);
    const result = {};
    for (let i = 0; i < k.length; i++) {
      const key = k[i];
      result[key] = sources[key].value;
    }
    return result;
  }
  function serializeChildren(root) {
    const result = {};
    for (let i = 0, len = root.owned.length; i < len; i++) {
      const node = root.owned[i];
      result[node.componentName ? `${node.componentName}:${node.name}` : node.name] = {
        ...serializeValues(node.sourceMap),
        ...node.owned ? serializeChildren(node) : {}
      };
    }
    return result;
  }
  const FALLBACK = Symbol("fallback");
  function dispose(d) {
    for (let i = 0; i < d.length; i++)
      d[i]();
  }
  function indexArray(list, mapFn, options = {}) {
    let items = [], mapped = [], disposers = [], signals = [], len = 0, i;
    onCleanup(() => dispose(disposers));
    return () => {
      const newItems = list() || [];
      newItems[$TRACK];
      return untrack(() => {
        if (newItems.length === 0) {
          if (len !== 0) {
            dispose(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            signals = [];
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot((disposer) => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
          return mapped;
        }
        if (items[0] === FALLBACK) {
          disposers[0]();
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
        }
        for (i = 0; i < newItems.length; i++) {
          if (i < items.length && items[i] !== newItems[i]) {
            signals[i](() => newItems[i]);
          } else if (i >= items.length) {
            mapped[i] = createRoot(mapper);
          }
        }
        for (; i < items.length; i++) {
          disposers[i]();
        }
        len = signals.length = disposers.length = newItems.length;
        items = newItems.slice(0);
        return mapped = mapped.slice(0, len);
      });
      function mapper(disposer) {
        disposers[i] = disposer;
        const [s, set] = createSignal(newItems[i]);
        signals[i] = set;
        return mapFn(s, i);
      }
    };
  }
  function createComponent(Comp, props) {
    return devComponent(Comp, props || {});
  }
  function trueFn() {
    return true;
  }
  const propTraps = {
    get(_, property, receiver) {
      if (property === $PROXY)
        return receiver;
      return _.get(property);
    },
    has(_, property) {
      return _.has(property);
    },
    set: trueFn,
    deleteProperty: trueFn,
    getOwnPropertyDescriptor(_, property) {
      return {
        configurable: true,
        enumerable: true,
        get() {
          return _.get(property);
        },
        set: trueFn,
        deleteProperty: trueFn
      };
    },
    ownKeys(_) {
      return _.keys();
    }
  };
  function resolveSource(s) {
    return (s = typeof s === "function" ? s() : s) == null ? {} : s;
  }
  function mergeProps(...sources) {
    return new Proxy({
      get(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          const v = resolveSource(sources[i])[property];
          if (v !== void 0)
            return v;
        }
      },
      has(property) {
        for (let i = sources.length - 1; i >= 0; i--) {
          if (property in resolveSource(sources[i]))
            return true;
        }
        return false;
      },
      keys() {
        const keys = [];
        for (let i = 0; i < sources.length; i++)
          keys.push(...Object.keys(resolveSource(sources[i])));
        return [...new Set(keys)];
      }
    }, propTraps);
  }
  function Index(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(indexArray(() => props.each, props.children, fallback ? fallback : void 0));
  }
  function Show(props) {
    let strictEqual = false;
    const keyed = props.keyed;
    const condition = createMemo(() => props.when, void 0, {
      equals: (a, b) => strictEqual ? a === b : !a === !b
    });
    return createMemo(() => {
      const c = condition();
      if (c) {
        const child = props.children;
        const fn = typeof child === "function" && child.length > 0;
        strictEqual = keyed || fn;
        return fn ? untrack(() => child(c)) : child;
      }
      return props.fallback;
    });
  }
  function Switch(props) {
    let strictEqual = false;
    let keyed = false;
    const conditions = children(() => props.children), evalConditions = createMemo(() => {
      let conds = conditions();
      if (!Array.isArray(conds))
        conds = [conds];
      for (let i = 0; i < conds.length; i++) {
        const c = conds[i].when;
        if (c) {
          keyed = !!conds[i].keyed;
          return [i, c, conds[i]];
        }
      }
      return [-1];
    }, void 0, {
      equals: (a, b) => a[0] === b[0] && (strictEqual ? a[1] === b[1] : !a[1] === !b[1]) && a[2] === b[2]
    });
    return createMemo(() => {
      const [index, when, cond] = evalConditions();
      if (index < 0)
        return props.fallback;
      const c = cond.children;
      const fn = typeof c === "function" && c.length > 0;
      strictEqual = keyed || fn;
      return fn ? untrack(() => c(when)) : c;
    });
  }
  function Match(props) {
    return props;
  }
  let DEV;
  {
    DEV = {
      writeSignal,
      serializeGraph,
      registerGraph,
      hashValue
    };
  }
  if (globalThis) {
    if (!globalThis.Solid$$)
      globalThis.Solid$$ = true;
    else
      console.warn("You appear to have multiple instances of Solid. This can lead to unexpected behavior.");
  }
  const booleans = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden", "indeterminate", "ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless", "selected"];
  const Properties = /* @__PURE__ */ new Set(["className", "value", "readOnly", "formNoValidate", "isMap", "noModule", "playsInline", ...booleans]);
  const ChildProperties = /* @__PURE__ */ new Set(["innerHTML", "textContent", "innerText", "children"]);
  const Aliases = {
    className: "class",
    htmlFor: "for"
  };
  const PropAliases = {
    class: "className",
    formnovalidate: "formNoValidate",
    ismap: "isMap",
    nomodule: "noModule",
    playsinline: "playsInline",
    readonly: "readOnly"
  };
  const DelegatedEvents = /* @__PURE__ */ new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]);
  const SVGNamespace = {
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace"
  };
  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
    while (aStart < aEnd || bStart < bEnd) {
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      if (aEnd === aStart) {
        const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
        while (bStart < bEnd)
          parentNode.insertBefore(b[bStart++], node);
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart]))
            a[aStart].remove();
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = a[--aEnd].nextSibling;
        parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
        parentNode.insertBefore(b[--bEnd], node);
        a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = /* @__PURE__ */ new Map();
          let i = bStart;
          while (i < bEnd)
            map.set(b[i], i++);
        }
        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart, sequence = 1, t;
            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence)
                break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index)
                parentNode.insertBefore(b[bStart++], node);
            } else
              parentNode.replaceChild(b[bStart++], a[aStart++]);
          } else
            aStart++;
        } else
          a[aStart++].remove();
      }
    }
  }
  const $$EVENTS = "_$DX_DELEGATE";
  function render(code, element, init) {
    let disposer;
    createRoot((dispose2) => {
      disposer = dispose2;
      element === document ? code() : insert(element, code(), element.firstChild ? null : void 0, init);
    });
    return () => {
      disposer();
      element.textContent = "";
    };
  }
  function template(html, check, isSVG) {
    const t = document.createElement("template");
    t.innerHTML = html;
    if (check && t.innerHTML.split("<").length - 1 !== check)
      throw `The browser resolved template HTML does not match JSX input:
${t.innerHTML}

${html}. Is your HTML properly formed?`;
    let node = t.content.firstChild;
    if (isSVG)
      node = node.firstChild;
    return node;
  }
  function delegateEvents(eventNames, document2 = window.document) {
    const e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
    for (let i = 0, l = eventNames.length; i < l; i++) {
      const name = eventNames[i];
      if (!e.has(name)) {
        e.add(name);
        document2.addEventListener(name, eventHandler);
      }
    }
  }
  function setAttribute(node, name, value) {
    if (value == null)
      node.removeAttribute(name);
    else
      node.setAttribute(name, value);
  }
  function setAttributeNS(node, namespace, name, value) {
    if (value == null)
      node.removeAttributeNS(namespace, name);
    else
      node.setAttributeNS(namespace, name, value);
  }
  function className(node, value) {
    if (value == null)
      node.removeAttribute("class");
    else
      node.className = value;
  }
  function addEventListener(node, name, handler, delegate) {
    if (delegate) {
      if (Array.isArray(handler)) {
        node[`$$${name}`] = handler[0];
        node[`$$${name}Data`] = handler[1];
      } else
        node[`$$${name}`] = handler;
    } else if (Array.isArray(handler)) {
      const handlerFn = handler[0];
      node.addEventListener(name, handler[0] = (e) => handlerFn.call(node, handler[1], e));
    } else
      node.addEventListener(name, handler);
  }
  function classList(node, value, prev = {}) {
    const classKeys = Object.keys(value || {}), prevKeys = Object.keys(prev);
    let i, len;
    for (i = 0, len = prevKeys.length; i < len; i++) {
      const key = prevKeys[i];
      if (!key || key === "undefined" || value[key])
        continue;
      toggleClassKey(node, key, false);
      delete prev[key];
    }
    for (i = 0, len = classKeys.length; i < len; i++) {
      const key = classKeys[i], classValue = !!value[key];
      if (!key || key === "undefined" || prev[key] === classValue || !classValue)
        continue;
      toggleClassKey(node, key, true);
      prev[key] = classValue;
    }
    return prev;
  }
  function style$1(node, value, prev = {}) {
    const nodeStyle = node.style;
    const prevString = typeof prev === "string";
    if (value == null && prevString || typeof value === "string")
      return nodeStyle.cssText = value;
    prevString && (nodeStyle.cssText = void 0, prev = {});
    value || (value = {});
    let v, s;
    for (s in prev) {
      value[s] == null && nodeStyle.removeProperty(s);
      delete prev[s];
    }
    for (s in value) {
      v = value[s];
      if (v !== prev[s]) {
        nodeStyle.setProperty(s, v);
        prev[s] = v;
      }
    }
    return prev;
  }
  function spread(node, accessor, isSVG, skipChildren) {
    if (typeof accessor === "function") {
      createRenderEffect((current) => spreadExpression(node, accessor(), current, isSVG, skipChildren));
    } else
      spreadExpression(node, accessor, void 0, isSVG, skipChildren);
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== void 0 && !initial)
      initial = [];
    if (typeof accessor !== "function")
      return insertExpression(parent, accessor, initial, marker);
    createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
  }
  function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
    props || (props = {});
    for (const prop in prevProps) {
      if (!(prop in props)) {
        if (prop === "children")
          continue;
        assignProp(node, prop, null, prevProps[prop], isSVG, skipRef);
      }
    }
    for (const prop in props) {
      if (prop === "children") {
        if (!skipChildren)
          insertExpression(node, props.children);
        continue;
      }
      const value = props[prop];
      prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef);
    }
  }
  function toPropertyName(name) {
    return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
  }
  function toggleClassKey(node, key, value) {
    const classNames = key.trim().split(/\s+/);
    for (let i = 0, nameLen = classNames.length; i < nameLen; i++)
      node.classList.toggle(classNames[i], value);
  }
  function assignProp(node, prop, value, prev, isSVG, skipRef) {
    let isCE, isProp, isChildProp;
    if (prop === "style")
      return style$1(node, value, prev);
    if (prop === "classList")
      return classList(node, value, prev);
    if (value === prev)
      return prev;
    if (prop === "ref") {
      if (!skipRef) {
        value(node);
      }
    } else if (prop.slice(0, 3) === "on:") {
      const e = prop.slice(3);
      prev && node.removeEventListener(e, prev);
      value && node.addEventListener(e, value);
    } else if (prop.slice(0, 10) === "oncapture:") {
      const e = prop.slice(10);
      prev && node.removeEventListener(e, prev, true);
      value && node.addEventListener(e, value, true);
    } else if (prop.slice(0, 2) === "on") {
      const name = prop.slice(2).toLowerCase();
      const delegate = DelegatedEvents.has(name);
      if (!delegate && prev) {
        const h = Array.isArray(prev) ? prev[0] : prev;
        node.removeEventListener(name, h);
      }
      if (delegate || value) {
        addEventListener(node, name, value, delegate);
        delegate && delegateEvents([name]);
      }
    } else if ((isChildProp = ChildProperties.has(prop)) || !isSVG && (PropAliases[prop] || (isProp = Properties.has(prop))) || (isCE = node.nodeName.includes("-"))) {
      if (prop === "class" || prop === "className")
        className(node, value);
      else if (isCE && !isProp && !isChildProp)
        node[toPropertyName(prop)] = value;
      else
        node[PropAliases[prop] || prop] = value;
    } else {
      const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
      if (ns)
        setAttributeNS(node, ns, prop, value);
      else
        setAttribute(node, Aliases[prop] || prop, value);
    }
    return value;
  }
  function eventHandler(e) {
    const key = `$$${e.type}`;
    let node = e.composedPath && e.composedPath()[0] || e.target;
    if (e.target !== node) {
      Object.defineProperty(e, "target", {
        configurable: true,
        value: node
      });
    }
    Object.defineProperty(e, "currentTarget", {
      configurable: true,
      get() {
        return node || document;
      }
    });
    if (sharedConfig.registry && !sharedConfig.done) {
      sharedConfig.done = true;
      document.querySelectorAll("[id^=pl-]").forEach((elem) => elem.remove());
    }
    while (node !== null) {
      const handler = node[key];
      if (handler && !node.disabled) {
        const data = node[`${key}Data`];
        data !== void 0 ? handler.call(node, data, e) : handler.call(node, e);
        if (e.cancelBubble)
          return;
      }
      node = node.host && node.host !== node && node.host instanceof Node ? node.host : node.parentNode;
    }
  }
  function spreadExpression(node, props, prevProps = {}, isSVG, skipChildren) {
    props || (props = {});
    if (!skipChildren && "children" in props) {
      createRenderEffect(() => prevProps.children = insertExpression(node, props.children, prevProps.children));
    }
    props.ref && props.ref(node);
    createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
    return prevProps;
  }
  function insertExpression(parent, value, current, marker, unwrapArray) {
    if (sharedConfig.context && !current)
      current = [...parent.childNodes];
    while (typeof current === "function")
      current = current();
    if (value === current)
      return current;
    const t = typeof value, multi = marker !== void 0;
    parent = multi && current[0] && current[0].parentNode || parent;
    if (t === "string" || t === "number") {
      if (sharedConfig.context)
        return current;
      if (t === "number")
        value = value.toString();
      if (multi) {
        let node = current[0];
        if (node && node.nodeType === 3) {
          node.data = value;
        } else
          node = document.createTextNode(value);
        current = cleanChildren(parent, current, marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          current = parent.firstChild.data = value;
        } else
          current = parent.textContent = value;
      }
    } else if (value == null || t === "boolean") {
      if (sharedConfig.context)
        return current;
      current = cleanChildren(parent, current, marker);
    } else if (t === "function") {
      createRenderEffect(() => {
        let v = value();
        while (typeof v === "function")
          v = v();
        current = insertExpression(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array = [];
      const currentArray = current && Array.isArray(current);
      if (normalizeIncomingArray(array, value, current, unwrapArray)) {
        createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
        return () => current;
      }
      if (sharedConfig.context) {
        if (!array.length)
          return current;
        for (let i = 0; i < array.length; i++) {
          if (array[i].parentNode)
            return current = array;
        }
      }
      if (array.length === 0) {
        current = cleanChildren(parent, current, marker);
        if (multi)
          return current;
      } else if (currentArray) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else
          reconcileArrays(parent, current, array);
      } else {
        current && cleanChildren(parent);
        appendNodes(parent, array);
      }
      current = array;
    } else if (value instanceof Node) {
      if (sharedConfig.context && value.parentNode)
        return current = multi ? [value] : value;
      if (Array.isArray(current)) {
        if (multi)
          return current = cleanChildren(parent, current, marker, value);
        cleanChildren(parent, current, null, value);
      } else if (current == null || current === "" || !parent.firstChild) {
        parent.appendChild(value);
      } else
        parent.replaceChild(value, parent.firstChild);
      current = value;
    } else
      console.warn(`Unrecognized value. Skipped inserting`, value);
    return current;
  }
  function normalizeIncomingArray(normalized, array, current, unwrap2) {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i], prev = current && current[i];
      if (item instanceof Node) {
        normalized.push(item);
      } else if (item == null || item === true || item === false)
        ;
      else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
      } else if (typeof item === "function") {
        if (unwrap2) {
          while (typeof item === "function")
            item = item();
          dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], Array.isArray(prev) ? prev : [prev]) || dynamic;
        } else {
          normalized.push(item);
          dynamic = true;
        }
      } else {
        const value = String(item);
        if (prev && prev.nodeType === 3 && prev.data === value) {
          normalized.push(prev);
        } else
          normalized.push(document.createTextNode(value));
      }
    }
    return dynamic;
  }
  function appendNodes(parent, array, marker) {
    for (let i = 0, len = array.length; i < len; i++)
      parent.insertBefore(array[i], marker);
  }
  function cleanChildren(parent, current, marker, replacement) {
    if (marker === void 0)
      return parent.textContent = "";
    const node = replacement || document.createTextNode("");
    if (current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (node !== el) {
          const isParent = el.parentNode === parent;
          if (!inserted && !i)
            isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
          else
            isParent && el.remove();
        } else
          inserted = true;
      }
    } else
      parent.insertBefore(node, marker);
    return [node];
  }
  function unsafeCast(t) {
    return t;
  }
  function relURL(path) {
    return new URL(path, window.location.href);
  }
  function hhmm2date(date, hhmm) {
    return new Date(`${date} ${hhmm}`);
  }
  function padZero2(num) {
    return String(num).padStart(2, "0");
  }
  function date2hhmm(date) {
    return `${padZero2(date.getHours())}:${padZero2(date.getMinutes())}`;
  }
  function date2mmss(date) {
    return `${padZero2(date.getMinutes())}:${padZero2(date.getSeconds())}`;
  }
  function assertNonNullable(v, msg) {
    if (v === null || v === void 0) {
      throw Error(msg != null ? msg : "unexpected null value");
    }
    return v;
  }
  function devLog(msg) {
    {
      console.log(msg);
    }
  }
  function openWin(opts) {
    const win = assertNonNullable(
      window.open(
        "",
        "",
        Object.entries(opts).map(([k, v]) => `${k}=${v}`).join(",")
      ),
      "cannot open windows"
    );
    window.addEventListener("unload", () => win.close());
    const title = win.document.createElement("title");
    title.textContent = opts.title;
    win.document.head.append(title);
    return win;
  }
  const startButton = "_startButton_nz33a_1";
  const settings$1 = "_settings_nz33a_7";
  const logs = "_logs_nz33a_8";
  const settingsEntry = "_settingsEntry_nz33a_16";
  const settingsSubmit = "_settingsSubmit_nz33a_21";
  const logsEntry = "_logsEntry_nz33a_40";
  const logsTimer = "_logsTimer_nz33a_41";
  const style = {
    startButton,
    settings: settings$1,
    logs,
    settingsEntry,
    settingsSubmit,
    logsEntry,
    logsTimer
  };
  const styleCss = '._startButton_nz33a_1::after {\n  content: "\u{1F3C1}";\n}\n._startButton_nz33a_1:hover::after {\n  content: "\u{1F6A9}";\n}\n._settings_nz33a_7,\n._logs_nz33a_8 {\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n  width: 15rem;\n  font-size: 0.75rem;\n  margin: auto;\n}\n._settingsEntry_nz33a_16 {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 0.5rem;\n}\n._settingsSubmit_nz33a_21 {\n  display: flex;\n  justify-content: end;\n}\n._settings_nz33a_7 label {\n  display: flex;\n  align-items: center;\n}\n._settings_nz33a_7 button,\n._settings_nz33a_7 input {\n  font-size: 0.7rem;\n}\n._settings_nz33a_7 input {\n  width: 6rem;\n  text-align: left;\n}\n._settings_nz33a_7 input[type="checkbox"] {\n  width: auto;\n}\n._logsEntry_nz33a_40,\n._logsTimer_nz33a_41 {\n  margin-bottom: 0.5rem;\n}\n._logsTimer_nz33a_41 {\n  color: blue;\n}\n._logsEntry_nz33a_40[data-type="SUCCESS"] {\n  color: green;\n}\n._logsEntry_nz33a_40[data-type="FAIL"] {\n  color: red;\n}\n';
  const _tmpl$$1 = /* @__PURE__ */ template(`<span></span>`, 2);
  function injectStyle(doc) {
    const css = doc.createElement("style");
    css.textContent = styleCss;
    doc.head.append(css);
  }
  function injectStartButton(cb) {
    document.querySelectorAll("li.cls_sec ul.sec_it_list li.it").forEach((room) => {
      const a = assertNonNullable(room.firstElementChild);
      render(() => (() => {
        const _el$ = _tmpl$$1.cloneNode(true);
        _el$.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const url = relURL(assertNonNullable(room.getAttribute("url")));
          cb(assertNonNullable(url.searchParams.get("roomId")));
        });
        createRenderEffect(() => className(_el$, style.startButton));
        return _el$;
      })(), a);
      a.prepend(assertNonNullable(a.lastElementChild));
    });
  }
  const $RAW = Symbol("store-raw"), $NODE = Symbol("store-node"), $NAME = Symbol("store-name");
  function wrap$1(value, name) {
    let p = value[$PROXY];
    if (!p) {
      Object.defineProperty(value, $PROXY, {
        value: p = new Proxy(value, proxyTraps$1)
      });
      if (!Array.isArray(value)) {
        const keys = Object.keys(value), desc = Object.getOwnPropertyDescriptors(value);
        for (let i = 0, l = keys.length; i < l; i++) {
          const prop = keys[i];
          if (desc[prop].get) {
            const get = desc[prop].get.bind(p);
            Object.defineProperty(value, prop, {
              get
            });
          }
        }
      }
      if (name)
        Object.defineProperty(value, $NAME, {
          value: name
        });
    }
    return p;
  }
  function isWrappable(obj) {
    let proto;
    return obj != null && typeof obj === "object" && (obj[$PROXY] || !(proto = Object.getPrototypeOf(obj)) || proto === Object.prototype || Array.isArray(obj));
  }
  function unwrap(item, set = /* @__PURE__ */ new Set()) {
    let result, unwrapped, v, prop;
    if (result = item != null && item[$RAW])
      return result;
    if (!isWrappable(item) || set.has(item))
      return item;
    if (Array.isArray(item)) {
      if (Object.isFrozen(item))
        item = item.slice(0);
      else
        set.add(item);
      for (let i = 0, l = item.length; i < l; i++) {
        v = item[i];
        if ((unwrapped = unwrap(v, set)) !== v)
          item[i] = unwrapped;
      }
    } else {
      if (Object.isFrozen(item))
        item = Object.assign({}, item);
      else
        set.add(item);
      const keys = Object.keys(item), desc = Object.getOwnPropertyDescriptors(item);
      for (let i = 0, l = keys.length; i < l; i++) {
        prop = keys[i];
        if (desc[prop].get)
          continue;
        v = item[prop];
        if ((unwrapped = unwrap(v, set)) !== v)
          item[prop] = unwrapped;
      }
    }
    return item;
  }
  function getDataNodes(target) {
    let nodes = target[$NODE];
    if (!nodes)
      Object.defineProperty(target, $NODE, {
        value: nodes = {}
      });
    return nodes;
  }
  function getDataNode(nodes, property, value) {
    return nodes[property] || (nodes[property] = createDataNode(value));
  }
  function proxyDescriptor(target, property) {
    const desc = Reflect.getOwnPropertyDescriptor(target, property);
    if (!desc || desc.get || !desc.configurable || property === $PROXY || property === $NODE || property === $NAME)
      return desc;
    delete desc.value;
    delete desc.writable;
    desc.get = () => target[$PROXY][property];
    return desc;
  }
  function trackSelf(target) {
    if (getListener()) {
      const nodes = getDataNodes(target);
      (nodes._ || (nodes._ = createDataNode()))();
    }
  }
  function ownKeys(target) {
    trackSelf(target);
    return Reflect.ownKeys(target);
  }
  function createDataNode(value) {
    const [s, set] = createSignal(value, {
      equals: false,
      internal: true
    });
    s.$ = set;
    return s;
  }
  const proxyTraps$1 = {
    get(target, property, receiver) {
      if (property === $RAW)
        return target;
      if (property === $PROXY)
        return receiver;
      if (property === $TRACK) {
        trackSelf(target);
        return receiver;
      }
      const nodes = getDataNodes(target);
      const tracked = nodes.hasOwnProperty(property);
      let value = tracked ? nodes[property]() : target[property];
      if (property === $NODE || property === "__proto__")
        return value;
      if (!tracked) {
        const desc = Object.getOwnPropertyDescriptor(target, property);
        if (getListener() && (typeof value !== "function" || target.hasOwnProperty(property)) && !(desc && desc.get))
          value = getDataNode(nodes, property, value)();
      }
      return isWrappable(value) ? wrap$1(value, target[$NAME] && `${target[$NAME]}:${property.toString()}`) : value;
    },
    has(target, property) {
      if (property === $RAW || property === $PROXY || property === $TRACK || property === $NODE || property === "__proto__")
        return true;
      const tracked = getDataNodes(target)[property];
      tracked && tracked();
      return property in target;
    },
    set() {
      console.warn("Cannot mutate a Store directly");
      return true;
    },
    deleteProperty() {
      console.warn("Cannot mutate a Store directly");
      return true;
    },
    ownKeys,
    getOwnPropertyDescriptor: proxyDescriptor
  };
  function setProperty(state2, property, value, deleting = false) {
    if (!deleting && state2[property] === value)
      return;
    const prev = state2[property];
    const len = state2.length;
    if (value === void 0) {
      delete state2[property];
    } else
      state2[property] = value;
    let nodes = getDataNodes(state2), node;
    if (node = getDataNode(nodes, property, prev))
      node.$(() => value);
    if (Array.isArray(state2) && state2.length !== len)
      (node = getDataNode(nodes, "length", len)) && node.$(state2.length);
    (node = nodes._) && node.$();
  }
  function mergeStoreNode(state2, value) {
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      setProperty(state2, key, value[key]);
    }
  }
  function updateArray(current, next) {
    if (typeof next === "function")
      next = next(current);
    next = unwrap(next);
    if (Array.isArray(next)) {
      if (current === next)
        return;
      let i = 0, len = next.length;
      for (; i < len; i++) {
        const value = next[i];
        if (current[i] !== value)
          setProperty(current, i, value);
      }
      setProperty(current, "length", len);
    } else
      mergeStoreNode(current, next);
  }
  function updatePath(current, path, traversed = []) {
    let part, prev = current;
    if (path.length > 1) {
      part = path.shift();
      const partType = typeof part, isArray = Array.isArray(current);
      if (Array.isArray(part)) {
        for (let i = 0; i < part.length; i++) {
          updatePath(current, [part[i]].concat(path), traversed);
        }
        return;
      } else if (isArray && partType === "function") {
        for (let i = 0; i < current.length; i++) {
          if (part(current[i], i))
            updatePath(current, [i].concat(path), traversed);
        }
        return;
      } else if (isArray && partType === "object") {
        const {
          from = 0,
          to = current.length - 1,
          by = 1
        } = part;
        for (let i = from; i <= to; i += by) {
          updatePath(current, [i].concat(path), traversed);
        }
        return;
      } else if (path.length > 1) {
        updatePath(current[part], path, [part].concat(traversed));
        return;
      }
      prev = current[part];
      traversed = [part].concat(traversed);
    }
    let value = path[0];
    if (typeof value === "function") {
      value = value(prev, traversed);
      if (value === prev)
        return;
    }
    if (part === void 0 && value == void 0)
      return;
    value = unwrap(value);
    if (part === void 0 || isWrappable(prev) && isWrappable(value) && !Array.isArray(value)) {
      mergeStoreNode(prev, value);
    } else
      setProperty(current, part, value);
  }
  function createStore(...[store, options]) {
    const unwrappedStore = unwrap(store || {});
    const isArray = Array.isArray(unwrappedStore);
    if (typeof unwrappedStore !== "object" && typeof unwrappedStore !== "function")
      throw new Error(`Unexpected type ${typeof unwrappedStore} received when initializing 'createStore'. Expected an object.`);
    const wrappedStore = wrap$1(unwrappedStore, options && options.name || DEV.hashValue(unwrappedStore));
    {
      const name = options && options.name || DEV.hashValue(unwrappedStore);
      DEV.registerGraph(name, {
        value: unwrappedStore
      });
    }
    function setStore(...args) {
      batch(() => {
        isArray && args.length === 1 ? updateArray(unwrappedStore, args[0]) : updatePath(unwrappedStore, args);
      });
    }
    return [wrappedStore, setStore];
  }
  function getOrDefault(key, defVal) {
    const val = GM_getValue(key);
    if (val === void 0) {
      GM_setValue(key, defVal);
      return defVal;
    }
    return val;
  }
  const [state, setState] = createStore({
    amStart: getOrDefault("amStart", "08:00"),
    amEnd: getOrDefault("amEnd", "12:00"),
    pmStart: getOrDefault("pmStart", "14:00"),
    pmEnd: getOrDefault("pmEnd", "20:00"),
    amMinMinutes: getOrDefault("amMinMinutes", 3 * 60),
    pmMinMinutes: getOrDefault("pmMinMinutes", 5 * 60),
    openStart: getOrDefault("openStart", "07:00"),
    openEnd: getOrDefault("openEnd", "22:00"),
    random: getOrDefault("random", false),
    tryStart: getOrDefault("tryStart", "07:00"),
    tryInterval: getOrDefault("tryInterval", 5),
    tryMax: getOrDefault("tryMax", 3)
  });
  const settings = state;
  function setSetting(key, val) {
    GM_setValue(key, val);
    setState(key, val);
  }
  function getSpareTime(spare, busy) {
    if (busy[0] <= spare[0]) {
      if (busy[1] <= spare[0]) {
        return [spare];
      } else if (busy[1] <= spare[1]) {
        return [[busy[1], spare[1]]];
      } else {
        return [];
      }
    } else if (busy[0] <= spare[1]) {
      if (busy[1] <= spare[1]) {
        return [
          [spare[0], busy[0]],
          [busy[1], spare[1]]
        ];
      } else {
        return [[spare[0], busy[0]]];
      }
    } else {
      return [spare];
    }
  }
  class RsvChecker {
    constructor(date, rsvSpan, openSpan, minMinutes) {
      __publicField(this, "date");
      __publicField(this, "start");
      __publicField(this, "end");
      __publicField(this, "minMs");
      this.date = date;
      this.minMs = minMinutes * 60 * 1e3;
      const rsvStart = hhmm2date(date, rsvSpan[0]);
      const rsvEnd = hhmm2date(date, rsvSpan[1]);
      const openStart = hhmm2date(date, openSpan[0]);
      const openEnd = hhmm2date(date, openSpan[1]);
      this.start = rsvStart > openStart ? rsvStart : openStart;
      this.end = rsvEnd < openEnd ? rsvEnd : openEnd;
    }
    check(rsvSta) {
      if (rsvSta.state === "close") {
        return null;
      }
      let allSpare = [[this.start, this.end]];
      for (const ts of rsvSta.ts) {
        allSpare = allSpare.reduce(
          (newSpare, spare) => newSpare.concat(
            getSpareTime(spare, [new Date(ts.start), new Date(ts.end)])
          ),
          new Array()
        );
      }
      for (const spare of allSpare) {
        if (spare[1].getTime() - spare[0].getTime() >= this.minMs) {
          return spare;
        }
      }
      return null;
    }
  }
  async function fetchRsvSta(openSpan, date, roomId) {
    const url = relURL("/ClientWeb/pro/ajax/device.aspx");
    Object.entries({
      byType: "devcls",
      classkind: "8",
      display: "fp",
      md: "d",
      room_id: roomId,
      purpose: "",
      selectOpenAty: "",
      cld_name: "default",
      date,
      fr_start: openSpan[0],
      fr_end: openSpan[1],
      act: "get_rsv_sta"
    }).forEach(([key, val]) => url.searchParams.set(key, val));
    return await fetch(url).then((t) => t.json());
  }
  const _tmpl$ = /* @__PURE__ */ template(`<input>`, 1), _tmpl$2 = /* @__PURE__ */ template(`<div><label> </label></div>`, 4), _tmpl$3 = /* @__PURE__ */ template(`<form><div><button type="submit"></button></div></form>`, 6), _tmpl$4 = /* @__PURE__ */ template(`<div><span>\u7B49\u5F85\u4E2D\uFF0C\u4E8E <!> \u540E\u5F00\u59CB\u6267\u884C</span></div>`, 5), _tmpl$5 = /* @__PURE__ */ template(`<div><i>*\u5173\u95ED\u7A97\u53E3\u4EE5\u53D6\u6D88\u9884\u7EA6</i></div>`, 4), _tmpl$6 = /* @__PURE__ */ template(`<div></div>`, 2);
  var LogType;
  (function(LogType2) {
    LogType2["Success"] = "SUCCESS";
    LogType2["Fail"] = "FAIL";
  })(LogType || (LogType = {}));
  function tomorrow() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  }
  async function performOccupation(roomId, {
    rsvDate,
    rsvAm,
    rsvPm
  }, onLog) {
    const rsvSta = await fetchRsvSta([settings.openStart, settings.openEnd], rsvDate, roomId);
    if (settings.random) {
      const offset = Math.random() * rsvSta.data.length;
      rsvSta.data = rsvSta.data.slice(offset).concat(rsvSta.data.slice(0, offset));
    }
    const occupy = (prefix, start, end, minMinutes) => {
      const checker = new RsvChecker(rsvDate, [start, end], [settings.openStart, settings.openEnd], minMinutes);
      for (const data of rsvSta.data) {
        const spare = checker.check(data);
        if (spare != null) {
          onLog({
            type: LogType.Success,
            msg: `${prefix}\u9884\u7EA6\u6210\u529F\uFF1A${date2hhmm(spare[0])}-${date2hhmm(spare[1])} \u4E8E ${data.devName} \u5EA7`
          });
          return;
        }
      }
      onLog({
        type: LogType.Fail,
        msg: `${prefix}\u9884\u7EA6\u5931\u8D25\uFF01`
      });
    };
    if (rsvAm) {
      occupy("\u4E0A\u5348", settings.amStart, settings.amEnd, settings.amMinMinutes);
    }
    if (rsvPm) {
      occupy("\u4E0B\u5348", settings.pmStart, settings.pmEnd, settings.pmMinMinutes);
    }
  }
  function Entry(props) {
    const Input2 = (props2) => (() => {
      const _el$ = _tmpl$.cloneNode(true);
      spread(_el$, props2, false, false);
      createRenderEffect((_p$) => {
        const _v$ = props.name, _v$2 = props.type;
        _v$ !== _p$._v$ && setAttribute(_el$, "id", _p$._v$ = _v$);
        _v$2 !== _p$._v$2 && setAttribute(_el$, "type", _p$._v$2 = _v$2);
        return _p$;
      }, {
        _v$: void 0,
        _v$2: void 0
      });
      return _el$;
    })();
    return (() => {
      const _el$2 = _tmpl$2.cloneNode(true), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild;
      insert(_el$2, createComponent(Switch, {
        get children() {
          return [createComponent(Match, {
            get when() {
              return props.type === "date" || props.type === "time" || props.type === "text";
            },
            get children() {
              return createComponent(Input2, {
                required: true,
                get value() {
                  return unsafeCast(props.value);
                },
                onChange: (ev) => props.onChange(unsafeCast(ev.currentTarget.value))
              });
            }
          }), createComponent(Match, {
            get when() {
              return props.type === "number";
            },
            get children() {
              return createComponent(Input2, {
                required: true,
                get value() {
                  return unsafeCast(props.value);
                },
                onChange: (ev) => props.onChange(unsafeCast(parseInt(ev.currentTarget.value)))
              });
            }
          }), createComponent(Match, {
            get when() {
              return props.type === "checkbox";
            },
            get children() {
              return createComponent(Input2, {
                get checked() {
                  return unsafeCast(props.value);
                },
                onChange: (ev) => props.onChange(unsafeCast(ev.currentTarget.checked))
              });
            }
          })];
        }
      }), null);
      createRenderEffect((_p$) => {
        const _v$3 = style.settingsEntry, _v$4 = props.name, _v$5 = props.label;
        _v$3 !== _p$._v$3 && className(_el$2, _p$._v$3 = _v$3);
        _v$4 !== _p$._v$4 && setAttribute(_el$3, "for", _p$._v$4 = _v$4);
        _v$5 !== _p$._v$5 && (_el$4.data = _p$._v$5 = _v$5);
        return _p$;
      }, {
        _v$3: void 0,
        _v$4: void 0,
        _v$5: void 0
      });
      return _el$2;
    })();
  }
  function LocalEntry(props) {
    return createComponent(Entry, mergeProps({
      get value() {
        return unsafeCast(settings[props.name]);
      },
      onChange: (val) => setSetting(props.name, unsafeCast(val))
    }, props));
  }
  function Setting(props) {
    const [args, setArgs] = createStore({
      rsvDate: tomorrow(),
      eagerly: false,
      rsvAm: true,
      rsvPm: true
    });
    function ArgsEntry(props2) {
      return createComponent(Entry, mergeProps({
        get value() {
          return unsafeCast(args[props2.name]);
        },
        onChange: (val) => setArgs(props2.name, unsafeCast(val))
      }, props2));
    }
    return (() => {
      const _el$5 = _tmpl$3.cloneNode(true), _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild;
      _el$5.addEventListener("submit", (ev) => {
        ev.preventDefault();
        props.onSubmit(args);
      });
      insert(_el$5, createComponent(ArgsEntry, {
        name: "rsvDate",
        label: "\u9884\u7EA6\u65E5\u671F",
        type: "date"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "amStart",
        label: "\u4E0A\u5348\u9884\u7EA6\u5F00\u59CB",
        type: "time"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "amEnd",
        label: "\u4E0A\u5348\u9884\u7EA6\u7ED3\u675F",
        type: "time"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "amMinMinutes",
        label: "\u4E0A\u5348\u6301\u7EED\u65F6\u95F4\uFF08\u5206\u949F\uFF09",
        type: "number"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "pmStart",
        label: "\u4E0B\u5348\u9884\u7EA6\u5F00\u59CB",
        type: "time"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "pmEnd",
        label: "\u4E0B\u5348\u9884\u7EA6\u7ED3\u675F",
        type: "time"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "pmMinMinutes",
        label: "\u4E0B\u5348\u6301\u7EED\u65F6\u95F4\uFF08\u5206\u949F\uFF09",
        type: "number"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "openStart",
        label: "\u56FE\u4E66\u9986\u8425\u4E1A\u5F00\u59CB",
        type: "time"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "openEnd",
        label: "\u56FE\u4E66\u9986\u8425\u4E1A\u7ED3\u675F",
        type: "time"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "tryStart",
        label: "\u5F00\u59CB\u5C1D\u8BD5\u65F6\u95F4",
        type: "time"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "tryInterval",
        label: "\u5C1D\u8BD5\u95F4\u9694\uFF08\u79D2\uFF09",
        type: "number"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "tryMax",
        label: "\u5C1D\u8BD5\u6B21\u6570",
        type: "number"
      }), _el$6);
      insert(_el$5, createComponent(LocalEntry, {
        name: "random",
        label: "\u968F\u673A\u9009\u5EA7",
        type: "checkbox"
      }), _el$6);
      insert(_el$5, createComponent(ArgsEntry, {
        name: "rsvAm",
        label: "\u9884\u7EA6\u4E0A\u5348",
        type: "checkbox"
      }), _el$6);
      insert(_el$5, createComponent(ArgsEntry, {
        name: "rsvPm",
        label: "\u9884\u7EA6\u4E0B\u5348",
        type: "checkbox"
      }), _el$6);
      insert(_el$5, createComponent(ArgsEntry, {
        name: "eagerly",
        label: "\u7ACB\u5373\u6267\u884C",
        type: "checkbox"
      }), _el$6);
      _el$7.textContent = "\u6267\u884C";
      createRenderEffect((_p$) => {
        const _v$6 = style.settings, _v$7 = style.settingsSubmit;
        _v$6 !== _p$._v$6 && className(_el$5, _p$._v$6 = _v$6);
        _v$7 !== _p$._v$7 && className(_el$6, _p$._v$7 = _v$7);
        return _p$;
      }, {
        _v$6: void 0,
        _v$7: void 0
      });
      return _el$5;
    })();
  }
  var OccupyStage;
  (function(OccupyStage2) {
    OccupyStage2["Prepare"] = "PREPARE";
    OccupyStage2["Perform"] = "PERFORM";
  })(OccupyStage || (OccupyStage = {}));
  function prepareOccupation(roomId) {
    const win = openWin({
      title: "O My Seat",
      width: 300,
      height: 500
    });
    injectStyle(win.document);
    render(() => {
      const [stage, setStage] = createSignal(OccupyStage.Prepare);
      const [logs2, setLogs] = createSignal([], {
        equals: false
      });
      const [remain, setRemain] = createSignal(-1);
      return (() => {
        const _el$8 = _tmpl$6.cloneNode(true);
        insert(_el$8, createComponent(Switch, {
          get children() {
            return [createComponent(Match, {
              get when() {
                return stage() === OccupyStage.Prepare;
              },
              get children() {
                return createComponent(Setting, {
                  onSubmit: (args) => {
                    const occupy = () => {
                      performOccupation(roomId, args, (log) => {
                        devLog(log.msg);
                        setLogs((logs3) => {
                          logs3.push(log);
                          return logs3;
                        });
                      });
                    };
                    setStage(OccupyStage.Perform);
                    if (args.eagerly) {
                      occupy();
                    } else {
                      const startTime = hhmm2date(new Date().toLocaleDateString(), settings.tryStart);
                      const timer = setInterval(() => {
                        setRemain(startTime.getTime() - new Date().getTime());
                        if (remain() <= 0) {
                          clearInterval(timer);
                          occupy();
                        }
                      }, 100);
                      win.addEventListener("unload", () => {
                        devLog("\u53D6\u6D88\u9884\u7EA6");
                        clearInterval(timer);
                      });
                    }
                  }
                });
              }
            }), createComponent(Match, {
              get when() {
                return stage() === OccupyStage.Perform;
              },
              get children() {
                const _el$9 = _tmpl$6.cloneNode(true);
                insert(_el$9, createComponent(Show, {
                  get when() {
                    return remain() > 0;
                  },
                  get children() {
                    return [(() => {
                      const _el$10 = _tmpl$4.cloneNode(true), _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$14 = _el$12.nextSibling;
                      _el$14.nextSibling;
                      insert(_el$11, () => date2mmss(new Date(remain())), _el$14);
                      createRenderEffect(() => className(_el$10, style.logsTimer));
                      return _el$10;
                    })(), (() => {
                      const _el$15 = _tmpl$5.cloneNode(true);
                      createRenderEffect(() => className(_el$15, style.logsEntry));
                      return _el$15;
                    })()];
                  }
                }), null);
                insert(_el$9, createComponent(Index, {
                  get each() {
                    return logs2();
                  },
                  children: (item) => (() => {
                    const _el$16 = _tmpl$6.cloneNode(true);
                    insert(_el$16, () => item().msg);
                    createRenderEffect((_p$) => {
                      const _v$8 = style.logsEntry, _v$9 = item().type;
                      _v$8 !== _p$._v$8 && className(_el$16, _p$._v$8 = _v$8);
                      _v$9 !== _p$._v$9 && setAttribute(_el$16, "data-type", _p$._v$9 = _v$9);
                      return _p$;
                    }, {
                      _v$8: void 0,
                      _v$9: void 0
                    });
                    return _el$16;
                  })()
                }), null);
                createRenderEffect(() => className(_el$9, style.logs));
                return _el$9;
              }
            })];
          }
        }));
        return _el$8;
      })();
    }, win.document.body);
    return;
  }
  function main() {
    injectStyle(document);
    injectStartButton(prepareOccupation);
  }
  {
    console.warn("WARN: IN DEV MODE");
  }
  main();
});
