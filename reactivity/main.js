/**
 * vue3.0响应式原理
 */

// 用proxy拦截数据，监听get set操作
// 用一个map收集所有依赖
// {
//     target: {
//         key: [effect1, effect2]
//     }
// }
let targetMap = new WeakMap()
let effectStack = [] // effct执行栈

function reactive(target){
    const observed = new Proxy(target, {
        get(target, key){
            const val = Reflect.get(target, key)
            // 收集依赖
            track(target, key)
            return val
        },
        set(target, key, val){
            const oldVal = Reflect.get(target, key)
            if(oldVal !== val){
                Reflect.set(target, key, val)
                // 获取依赖，触发相关的effect
                trigger(target, key)
            }
        }
    })
    return observed
}
function track(target, key){
    const effect = effectStack[effectStack.length - 1]
    if(effect){
        // 初始化
        let depMap = targetMap.get(target)
        if(depMap === undefined){
            depMap = new Map()
            targetMap.set(target, depMap)
        }

        let dep = depMap.get(key)
        if(dep === undefined){
            dep = new Set()
            depMap.set(key, dep)
        }
        // 缓存
        if(!dep.has(effect)){
            dep.add(effect)
            effect.deps.push(dep)
        }
    }
}
function trigger(target, key){
    let depMap = targetMap.get(target)
    if(depMap === undefined){
        return
    }
    const effects = new Set()
    const computeds = new Set()
    if(key){
        let deps = depMap.get(key)
        deps.forEach(effect => {
            if(effect.computed){
                computeds.add(effect)
            }else{
                effects.add(effect)
            }
        })
    }
    effects.forEach(effect => effect())
    computeds.forEach(computed => computed())
}

function effect(fn, options = {}){
    let e = createReactiveEffect(fn, options)
    if(!options.lazy){
        e()
    }
    return e
}
function createReactiveEffect(fn, options = {}){
    // effect扩展配置
    const effect = function(...args){
        return run(effect, fn, args)
    }
    effect.deps = []
    effect.computed = options.computed
    effect.lazy = options.lazy
    return effect
}
function run(effect, fn, args){
    if(effectStack.indexOf(effect) === -1){
        try{
            effectStack.push(effect)
            return fn(...args)
        }finally{
            effectStack.pop()
        }  
    }
}
function computed(fn){
    const runner = effect(fn, {
        computed: true,
        lazy: true
    })
    // 返回一个对象，所以获取计算属性的值需要写 .value
    return {
        get value(){
            return runner()
        }
    }
}