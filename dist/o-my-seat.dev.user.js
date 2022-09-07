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
    createRoot((dispose) => {
      disposer = dispose;
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
  function relURL(path) {
    return new URL(path, window.location.href);
  }
  function assertNonNullable(v, msg) {
    if (v === null || v === void 0) {
      throw Error(msg != null ? msg : "unexpected null value");
    }
    return v;
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
  const startButton = "_startButton_7hh38_1";
  const settings$1 = "_settings_7hh38_7";
  const settingsEntry = "_settingsEntry_7hh38_14";
  const settingsSubmit = "_settingsSubmit_7hh38_19";
  const style = {
    startButton,
    settings: settings$1,
    settingsEntry,
    settingsSubmit
  };
  const styleCss = '._startButton_7hh38_1::after {\n  content: "\u{1F3C1}";\n}\n._startButton_7hh38_1:hover::after {\n  content: "\u{1F6A9}";\n}\n._settings_7hh38_7 {\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n  width: 17.5rem;\n  font-size: 0.75rem;\n}\n._settingsEntry_7hh38_14 {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 0.5rem;\n}\n._settingsSubmit_7hh38_19 {\n  display: flex;\n  justify-content: end;\n}\n._settings_7hh38_7 label {\n  display: flex;\n  align-items: center;\n}\n._settings_7hh38_7 button,\n._settings_7hh38_7 input {\n  font-size: 0.7rem;\n}\n._settings_7hh38_7 input {\n  width: 6.5rem;\n  text-align: left;\n}\n';
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
    tryStart: getOrDefault("tryStart", "07:00"),
    tryInterval: getOrDefault("tryInterval", 5),
    tryMax: getOrDefault("tryMax", 3)
  });
  const settings = state;
  function setSetting(key, val) {
    GM_setValue(key, val);
    setState(key, val);
  }
  function hhmm2date(date, hhmm) {
    return new Date(`${date} ${hhmm}`);
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
  const _tmpl$ = /* @__PURE__ */ template(`<div><label> </label><input required></div>`, 5), _tmpl$2 = /* @__PURE__ */ template(`<div><form><div><button type="submit"></button></div></form></div>`, 8);
  function LocalSetting(props) {
    return createComponent(Setting, mergeProps({
      get value() {
        return String(settings[props.name]);
      },
      onChange: (ev) => setSetting(props.name, props.parse(ev.currentTarget.value))
    }, props));
  }
  function Setting(props) {
    return (() => {
      const _el$ = _tmpl$.cloneNode(true), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$2.nextSibling;
      spread(_el$4, props, false, false);
      createRenderEffect((_p$) => {
        const _v$ = style.settingsEntry, _v$2 = props.name, _v$3 = props.label, _v$4 = props.name;
        _v$ !== _p$._v$ && className(_el$, _p$._v$ = _v$);
        _v$2 !== _p$._v$2 && setAttribute(_el$2, "for", _p$._v$2 = _v$2);
        _v$3 !== _p$._v$3 && (_el$3.data = _p$._v$3 = _v$3);
        _v$4 !== _p$._v$4 && setAttribute(_el$4, "id", _p$._v$4 = _v$4);
        return _p$;
      }, {
        _v$: void 0,
        _v$2: void 0,
        _v$3: void 0,
        _v$4: void 0
      });
      return _el$;
    })();
  }
  function identity(t) {
    return t;
  }
  function tomorrow() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  }
  function padZero2(num) {
    return String(num).padStart(2, "0");
  }
  function date2hhmm(date) {
    return `${padZero2(date.getHours())}:${padZero2(date.getMinutes())}`;
  }
  async function performOccupation(roomId, date, onSuccess, onFail) {
    const rsvSta = await fetchRsvSta([settings.openStart, settings.openEnd], date, roomId);
    function occupy(prefix, start, end, minMinutes) {
      const checker = new RsvChecker(date, [start, end], [settings.openStart, settings.openEnd], minMinutes);
      for (const data of rsvSta.data) {
        const spare = checker.check(data);
        if (spare != null) {
          onSuccess(`${prefix}\u9884\u7EA6\u6210\u529F\uFF1A${date2hhmm(spare[0])}-${date2hhmm(spare[1])}\u4E8E${data.devName}\u5EA7`);
          return;
        }
      }
      onFail(`${prefix}\u9884\u7EA6\u5931\u8D25\uFF01`);
    }
    occupy("\u4E0A\u5348", settings.amStart, settings.amEnd, settings.amMinMinutes);
    occupy("\u4E0B\u5348", settings.pmStart, settings.pmEnd, settings.pmMinMinutes);
  }
  function prepareOccupation(roomId) {
    const win = openWin({
      title: "\u8BBE\u7F6E",
      width: 300,
      height: 400
    });
    injectStyle(win.document);
    render(() => {
      const [date, setDate] = createSignal(tomorrow());
      return (() => {
        const _el$5 = _tmpl$2.cloneNode(true), _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild;
        _el$6.addEventListener("submit", (ev) => {
          ev.preventDefault();
          performOccupation(roomId, date(), win.alert, win.alert);
        });
        insert(_el$6, createComponent(Setting, {
          name: "rsvDate",
          label: "\u9884\u7EA6\u65E5\u671F",
          type: "date",
          get value() {
            return tomorrow();
          },
          onChange: (ev) => setDate(ev.currentTarget.value)
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "amStart",
          label: "\u4E0A\u5348\u9884\u7EA6\u5F00\u59CB",
          type: "time",
          parse: identity
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "amEnd",
          label: "\u4E0A\u5348\u9884\u7EA6\u7ED3\u675F",
          type: "time",
          parse: identity
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "amMinMinutes",
          label: "\u4E0A\u5348\u6301\u7EED\u65F6\u95F4\uFF08\u5206\u949F\uFF09",
          type: "number",
          parse: parseInt
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "pmStart",
          label: "\u4E0B\u5348\u9884\u7EA6\u5F00\u59CB",
          type: "time",
          parse: identity
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "pmEnd",
          label: "\u4E0B\u5348\u9884\u7EA6\u7ED3\u675F",
          type: "time",
          parse: identity
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "pmMinMinutes",
          label: "\u4E0B\u5348\u6301\u7EED\u65F6\u95F4\uFF08\u5206\u949F\uFF09",
          type: "number",
          parse: parseInt
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "openStart",
          label: "\u56FE\u4E66\u9986\u8425\u4E1A\u5F00\u59CB",
          type: "time",
          parse: identity
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "openEnd",
          label: "\u56FE\u4E66\u9986\u8425\u4E1A\u7ED3\u675F",
          type: "time",
          parse: identity
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "tryStart",
          label: "\u5F00\u59CB\u5C1D\u8BD5\u65F6\u95F4",
          type: "time",
          parse: identity
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "tryInterval",
          label: "\u5C1D\u8BD5\u95F4\u9694\uFF08\u79D2\uFF09",
          type: "number",
          parse: parseInt
        }), _el$7);
        insert(_el$6, createComponent(LocalSetting, {
          name: "tryMax",
          label: "\u5C1D\u8BD5\u6B21\u6570",
          type: "number",
          parse: parseInt
        }), _el$7);
        _el$8.textContent = "\u6267\u884C";
        createRenderEffect((_p$) => {
          const _v$5 = style.settings, _v$6 = style.settingsSubmit;
          _v$5 !== _p$._v$5 && className(_el$6, _p$._v$5 = _v$5);
          _v$6 !== _p$._v$6 && className(_el$7, _p$._v$6 = _v$6);
          return _p$;
        }, {
          _v$5: void 0,
          _v$6: void 0
        });
        return _el$5;
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
