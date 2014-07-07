/**
  * progressbar组件，
  *
  */
define(["avalon", "text!./avalon.progressbar.html", "css!./avalon.progressbar.css", "css!../chameleon/oniui-common.css"], function(avalon, template) {

    // 园的半径，边框宽度
    function circleValueList(r, bw) {
        var arr = [],
            r = r - bw,
            arc,
            x,
            y,
            res
        for(var i = 0; i <= 100; i++) {
            arc = Math.PI / 2 - Math.PI / 50 * i
            x = Math.cos(arc) * r + r * 1 + bw * 1
            y = (1 - Math.sin(arc).toFixed(4)) * r + bw * 1
            res = (i ? " L" : "M") + x + " " + y + (i == 100 ? "Z" : "")
            arr.push(res)
        }
        return arr
    }
    var svgSupport = !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect
    if(!svgSupport &&  document.namespaces &&  !document.namespaces["v"]) {
        document.namespaces.add("v", "urn:schemas-microsoft-com:vml")
    }

    var widget = avalon.ui.progressbar = function(element, data, vmodels) {
        var options = data.progressbarOptions
        //方便用户对原始模板进行修改,提高制定性
        options.template = options.getTemplate(template, options)

        var vmodel = avalon.define(data.progressbarId, function(vm) {
            avalon.mix(vm, options)
            vm.widgetElement = element
            var newElem = element, 
                simulateTimer,
                barElement,
                labelElement,
                barParElement

            vm.$d = svgSupport && vm.circle && circleValueList(options.circleRadius, options.circleBorderWidth) || []
            vm.$skipArray = ["widgetElement", "template", "svgSupport"]
            vm.ended = false
            // svg绘制一个圆，路径数据
            vm.circleCoordinates = ""
            // svg绘制扇形，进度条效果，路径数据
            vm.barCoordinates = ""
            vm.angel = options.value || 0
            vm.svgSupport = svgSupport
            vm.successValue = vm.countDown ? 0 : 100
            vm.value = vm.countDown ? 100 : vm.value
            vm.angel = vm.countDown ? 360 : 360 * vm.angel / 100

            var inited
            vm.$init = function() {
                if(inited) return
                inited = true
                newElem.innerHTML = vmodel.template
                avalon.scan(element, [vmodel].concat(vmodels))
                if(vmodel.label) {
                    var nodes = newElem.getElementsByTagName("div")
                    avalon.each(nodes, function(i, item) {
                        var ele = avalon(item)
                        if(vmodel.circle) {
                            if(ele.hasClass("ui-progressbar-circle-par")) {
                                barParElement = ele
                            } else if(ele.hasClass("ui-progressbar-circle-bar")) {
                                barElement = ele
                            }
                        } else {
                            if(ele.hasClass("ui-progressbar-label")) {
                                labelElement = item
                            } else if(ele.hasClass("ui-progressbar-bar")) {
                                barElement = item
                                barParElement = item.parentNode
                            }
                        }
                    })
                }
                // get Css from skin
                vmodel._computeCss()
                if(!vmodel.getStyleFromSkin) vmodel.circleBar()
                // callback after inited
                if(typeof options.onInit === "function" ) {
                    //vmodels是不包括vmodel的 
                    options.onInit.call(element, vmodel, options, vmodels)
                }
                // 开启模拟效果
                vmodel._simulater()
            }
            // 适用svg绘制圆圈的v生成方式
            // vml不走这个逻辑，有直接绘制圆弧的方法
            vm.circleBar = function(v) {
                if(vmodel.circle || !svgSupport) {
                    var v = v || vmodel.value || 0
                    v = v > 100 ? 100 : v > 0 ? v : 0
                    vmodel.barCoordinates = v == 100 ? vmodel.circleCoordinates : vmodel.$d.slice(0, v+1).join("") + (v < 100 && v ? "" : "Z")
                }
            }
            // 计算label tip的位置
            vm._getLeft = function() {
                if(vmodel.circle || !labelElement || vmodel.inTwo) return
                var bw = barElement && barElement.offsetWidth || 0,
                    lw = labelElement.offsetWidth || 0,
                    bpw = barParElement && barParElement.offsetWidth || 0,
                    res = bpw - bw > lw + 2 ? bw - lw / 2 + 2 : bpw - lw
                    res = res > 0 ? res : 0
                    labelElement.style.left =  res + 'px'
            }

            // 进度条模拟
            vm._simulater = function() {
                if(vmodel.simulate !== false && !vmodel.indeterminate) {
                    clearTimeout(simulateTimer)
                    simulateTimer = setTimeout(function() {
                        if(vmodel.success || vmodel.ended || vmodel.indeterminate) return clearTimeout(simulateTimer)
                        var v = vmodel.simulater(vmodel.value || 0, vmodel)
                        if(vmodel.success) {
                            v = vmodel.successValue
                            vmodel.value =  v
                            return
                        }
                        if(vmodel.ended) return
                        if(vmodel.countDown) {
                            if(v <= 0) return
                        } else {
                            if(v >= 100) return
                        }
                        vmodel.value =  v
                        simulateTimer = setTimeout(arguments.callee, vmodel.simulate)
                    }, vmodel.simulate)
                }
            }

            vm.$remove = function() {
                element.innerHTML = element.textContent = ""
            }
            // 设置bar元素宽度
            vm._cssMaker = function(inTwo) {
                if(vmodel.value === false && vmodel.indeterminate || vmodel.value == 100) return inTwo ? 0 : "100%"
                return inTwo ? 100 - (vmodel.value || 0) + "%" : (vmodel.value || 0) + "%"
            }

            // 不知当前进度
            vm._indeterminate = function() {
                return vmodel.indeterminate && vmodel.value == false && !vmodel.inTwo
            }
            // 进度条分成左右两段显示的时候是否显示label
            vm._showLabel = function(label, inTwo) {
                return label && inTwo
            }
            // 展示label
            vm._labelShower = function(value) {
                return vmodel.labelShower.call(vmodel, arguments[0], arguments[1], vmodel)
            }

            //@method start() 开始进度推进，该接口适用于模拟进度条
            vm.start = function() {
                vmodel.indeterminate = false
                vmodel.ended = false
                vmodel._simulater()
            }

            //@method end(value) 结束进度推进，该接口适用于模拟进度条，value为100表示结束，failed表示失败，undefine等于pause，其他则终止于value，并在label上显示
            vm.end = function(value) {
                clearTimeout(simulateTimer)
                vmodel.ended = true
                if(value != void 0) vmodel.value = value
            }

            //@method reset(value) 重置设置项，参数可选，为需要重设的值
            vm.reset = function(value) {
                var obj = {}
                avalon.mix(obj, {
                    value: value != void 0 ? value : widget.defaults.value
                    , indeterminate: widget.defaults.indeterminate
                    , success: false
                }, options)
                avalon.mix(vmodel, obj)
                vmodel.ended = false
                vmodel._simulater()
            }

            //@method progress(value) 设置value值，其实也可以直接设置vmodel.value
            vm.progress = function(value) {
                vmodel.value = value
            }
            // get css from css file
            //@method _computeCss 动态切换皮肤之后，如果需要更新提取圆形进度条的样式，可以调用这个方法
            vm._computeCss = function() {
                if(vmodel.circle && vmodel.getStyleFromSkin) {
                    if(barElement && barParElement) {
                        var radius = barElement.height(),
                            outerHeight = barElement.outerHeight()
                        // wait utill element is rendered
                        if(!radius) return setTimeout(vmodel._computeCss, 16)
                        vmodel.circleColor = barElement.css("color")
                        vmodel.circleBorderColor = barParElement.css("background-color")
                        vmodel.circleBarColor = barElement.css("background-color")
                        vmodel.circleBorderWidth = parseInt((outerHeight - radius) / 2) || 1
                        vmodel.circleRadius = radius
                        vmodel.$d = svgSupport && vmodel.circle && circleValueList(vmodel.circleRadius, vmodel.circleBorderWidth) || []
                        vmodel.circleBar()
                        vmodel.circleCoordinates =vmodel.$d.join("")
                    }
                }
            }

        })
        // 模拟进度条情形下，不监控success属性的变化
        vmodel.$watch("success", function(newValue) {
            if(newValue && vmodel.simulate) vmodel.value = vmodel.successValue
            if(newValue) vmodel.onComplete.call(vmodel)
        })
        vmodel.$watch("value", function(newValue) {
            if(newValue == vmodel.successValue) vmodel.success = true
            vmodel.circle && vmodel.circleBar()
            vmodel._getLeft()
            vmodel.angel = 360 * newValue / 100
            vmodel.onChange && vmodel.onChange.call(vmodel, newValue)
        })

        return vmodel
    }
    //add args like this:
    //argName: defaultValue, \/\/@param description
    //methodName: code, \/\/@optMethod optMethodName(args) description 
    widget.defaults = {
        value: false, //@param 当前进度值 0 - 100 or false
        label: true, //@param 是否在进度条上显示进度数字提示
        simulate: false, //@param 是否模拟进度条效果，默认为否，模拟的时候需要调用触发告知完成，模拟会采用模拟函数及算子进行模拟，取值为int表示动画效果间隔ms数
        indeterminate: false, //@param 是否不确定当前进度，现在loading效果
        countDown: false,//@param 倒计时
        inTwo: false, //@param 是否显示左右两段
        circle: false,//@param 圆形
        getStyleFromSkin: true,//@param 是否从皮肤的css里面计算获取圆形进度条样式，默认为true，设置为true的时候，将忽略下面所有circle*样式设置
        circleColor: "#ffffff",//@param 圆形填充色彩，可以配制为从皮肤中提取，只在初始化的时候提取
        circleBorderColor: "#dedede",//@param 圆形边框颜色，，可以配制为从皮肤中提取，只在初始化的时候提取
        circleBarColor: "#619FE8",//@param 圆形进度条边框颜色，可以配制为从皮肤中提取，只在初始化的时候提取
        circleRadius: 0,//@param 圆形的半径，可以配制为从皮肤中提取，只在初始化的时候提取
        circleBorderWidth: 0, //@param 圆形的边框宽度，可以配制为从皮肤中提取，只在初始化的时候提取
        success: false, //@param 是否完成，进度为100时或者外部将success置为true，用于打断模拟效果
        //@optMethod onInit(vmodel, options, vmodels) 完成初始化之后的回调,call as element's method
        onInit: avalon.noop,
        //@optMethod simulater(value, vmodel) 模拟进度进行效果函数，参数为当前进度和vmodel，默认return value + 5 * Math.random() >> 0
        simulater: function(i, vmodel) {
            if(vmodel.countDown) return i - 5 * Math.random() >> 0
            return i + 5 * Math.random() >> 0
        },
        //@optMethod getTemplate(tmp, opts) 用于修改模板的接口，默认不做修改
        getTemplate: function(tmpl, opts) {
            return tmpl
        },//@optMethod getTemplate(tpl, opts) 定制修改模板接口
        //@optMethod onChange(value) value发生变化回调，this指向vmodel
        onChange: avalon.noop,
        //@optMethod onComplete() 完成回调，默认空函数，this指向vmodel
        onComplete: avalon.noop,
        //@optMethod labelShower(value, isContainerLabel) 用于格式化进度条上label显示文字，默认value为false显示“loading…”，完成显示“complete!”，失败显示“failed!”，第二个参数是是否是居中显示的label，两段显示的时候，默认将这个label内容置空，只显示两边的label,this指向vmodel
        labelShower: function(value, l1, vmodel) {
            var value = l1 == "inTwo" ? 100 - (value || 0) : value
            var successValue = vmodel ? vmodel.successValue : 100
            if(l1 == "l1" && vmodel.inTwo) return ""
            if(value === false) return "loading…"
            if(value === "failed") return "failed!"
            if(value == successValue) return "complete!"
            return value + "%"
        },
        $author: "skipper@123"
    }
})