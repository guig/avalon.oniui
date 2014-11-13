/**
 * @cnName 输入引导模块
 * @enName mask
 * @introduce
 *  <p>这是ms-duplex2.0的一个扩展模块，用于引导用户输入。</p>
 *  <p>通过如下方式使用:</p>
 *  ```html
 *   <input ms-duplex-mask="a"  data-duplex-mask="((00/00其他字符0000)"/>
 *  ```
 */

define(["avalon"], function() {

    avalon.duplexHooks.mask = {
        init: function(_, data) {
            var elem = data.element
            var maskText = elem.getAttribute("data-duplex-mask")
            if (maskText) {
                data.msMask = new Mask(elem, maskText)
                function keyCallback(e) {
                    var k = e.which || e.keyCode
                    if (e.type === "click") {
                        k = 100
                    }
                    var valueLength = elem.value.length
                    if (valueLength && (data.msMask.valueMask.length !== valueLength)) {
                        data.msMask.masked = false
                    }

                    if (e.ctrlKey || e.altKey || e.metaKey || k < 32) //Ignore
                        return

                    var caret = getCaret(elem)
                    var impurity = data.msMask.vmodelData
                    function getPos(i, left, n) {
                        var step = left ? -1 : +1
                        var old = i
                        while (i >= -1 && i < n) {
                            i = i + step
                            if ((impurity[i] !== null) && i !== -1 && i !== n) {
                                return i
                            }
                            if (i === -1) {
                                return  old + 1
                            }
                            if (i === n) {
                                return  old - 1
                            }
                        }
                    }
                    var n = elem.value.length - 1
                    var pos
                    //  console.log(k)
                    if (k === 37 || k === 38) {//向左向上移动光标
                        pos = caret.start - 1
                        if (pos < 1) {
                            pos = 0
                        }
                        if (impurity[pos] === null) {
                            pos = getPos(pos, true, n)
                        }
                    } else if (k === 39 || k === 40) {//向右向下移动光标
                        pos = caret.end//只操作end
                        if (pos >= n) {
                            pos -= 1
                        }
                        if (impurity[pos] === null) {
                            pos = getPos(pos, false, n)
                        }
                    } else if (k && k !== 13) {//如果是在光标高亮处直接键入字母
                        pos = caret.start
                        if (pos > n) {
                            pos -= 1
                        }
                        if (impurity[pos] === null) {
                            pos = getPos(pos, false, n)
                        }
                    }
                    if (typeof pos === "number") {
                        setTimeout(function() {
                            setCaret(elem, pos, pos + 1)
                        })
                    }

                    if (e.preventDefault) {
                        e.preventDefault()
                    } else {
                        e.returnValue = false
                    }
                }
                data.bound("keydown", function(e) {
                    elem.userTrigger = true
                })
                //  data.bound("keyup", keyCallback)
                //  data.bound("click", keyCallback)
                var mask = data.msMask
                function showMask(e) {
                    if (!e || !mask.masked) {
                        elem.value = mask.valueMask
                        elem.userTrigger = mask.masked = true
                        var index = mask.vmodelData.indexOf(null)//定位于第一个要填空的位置上
                        if (index !== -1) {
                            mask.index = index
                            setCaret(elem, index, index + 1)
                        }
                    }
                }
                function hideMask() {
                    if ((mask.hideIfInvalid && !mask.valid) ||
                            (mask.hideIfPristine && mask.value === mask.valueMask)) {
                        elem.value = mask.oldValue = mask.masked = ""//注意IE6-8下，this不指向element
                    }
                }
                if (mask.showAlways) {
                    showMask()
                } else {
                    if (mask.showIfFocus) {
                        data.bound("focus", showMask)
                        data.bound("blur", hideMask)
                    }
                    if (mask.showIfHover) {
                        data.bound("mouseover", showMask)
                        data.bound("mouseout", hideMask)
                    }
                }
            } else {
                throw ("请指定data-duplex-mask")
            }
        },
        get: function(val, data) {//用户点击时会先触发这里
            var elem = data.element
            console.log("get", val, elem.userTrigger)
            var mask = data.msMask
            if (elem.userTrigger) {
                mask.getter(val)
                elem.oldValue = val
                elem.userTrigger = false
                var index = mask.vmodelData.indexOf(null)
                if(index === -1){
                    index = mask.index
                }else{
                    mask.index = index
                }
                console.log(index)
                setTimeout(function() {
                    setCaret(elem, index, index + 1)
                })
                return mask.vmodelData.join("")
            } else {
                return mask.masked ? val : ""
            }
        },
        set: function(val, data) {//将vm中数据放到这里进行处理，让用户看到经过格式化的数据
            // 第一次总是得到符合格式的数据
            var elem = data.element
            console.log("SETTTT")
            return  data.msMask.masked ? data.msMask.viewData.join("") : val
        }
    }

    function Mask(element, dataMask) {
        var options = avalon.getWidgetData(element, "duplexMask")
        var t = {}
        try {
            t = new Function("return " + options.translations)()
        } catch (e) {
        }
        avalon.mix(this, Mask.defaults, options)
        this.translations = avalon.mix({}, Mask.defaults.translations, t)
        this.element = element //@config {Element} 组件实例要作用的input元素
        this.dataMask = dataMask //@config {String} 用户在input/textarea元素上通过data-duplex-mask定义的属性值
        //第一次将dataMask放进去，得到element.value为空时，用于提示的valueMask
        this.getter(dataMask, true)
        // console.log(this.viewData.join("") + " * ")
        this.valueMask = this.viewData.join("")// valueMask中的元字符被全部替换为对应的占位符后的形态，用户实际上在element.value看到的形态
    }
    Mask.defaults = {
        placehoder: "_", //@config {Boolean} "_", 将元字符串换为"_"显示到element.value上，如99/99/9999会替换为__/__/____，可以通过data-duplex-mask-placehoder设置
        hideIfInvalid: false, //@config {Boolean} false, 如果它不匹配就会在失去焦点时清空value，可以通过data-duplex-mask-hide-if-invalid设置
        hideIfPristine: true, //@config {Boolean} true如果它没有改动过就会在失去焦点时清空value，可以通过data-duplex-mask-hide-if-pristine设置
        showIfHover: false, //@config {Boolean} false 当鼠标掠过其元素上方就显示它出来，可以通过data-duplex-mask-show-if-hover设置
        showIfFocus: true, //@config {Boolean} true 当用户让其元素得到焦点就显示它出来，可以通过data-duplex-mask-show-if-focus设置
        showAlways: false, //@config {Boolean} false 总是显示它，可以通过data-duplex-mask-show-always设置
        translations: {//@config {Object} 此对象上每个键名都是元字符，都对应一个对象，上面有pattern(正则)，placehoder(占位符，如果你不想用"_"),optional（表示可选）
            "0": {pattern: /\d/, optional: true},
            "9": {pattern: /\d/},
            "A": {pattern: /[a-zA-Z]/},
            "*": {pattern: /[a-zA-Z0-9]/}
        }
    }
    Mask.prototype = {
        getter: function(value, replace) {
            var maskArray = this.dataMask.split("")//用户定义的data-duplex-mask的值
            var valueArray = value.split("")
            var translations = this.translations
            var viewData = []
            var vmodelData = []
            // (9999/99/99) 这个是data-duplex-mask的值，其中“9”为“元字符”，“(”与 “/” 为“提示字符”
            // (____/__/__) 这是用占位符处理后的mask值
            while (maskArray.length) {
                var m = maskArray.shift()
                var el = valueArray.shift()//123456
                if (translations[m]) {//如果碰到元字符
                    var translation = translations[m]
                    var pattern = translation.pattern
                    if (el && el.match(pattern)) {//如果匹配
                        if (replace) {
                            vmodelData.push(null)
                            viewData.push(translation.placehoder || this.placehoder)
                        } else {
                            vmodelData.push(el)
                            viewData.push(el)
                        }
                    } else {
                        vmodelData.push(null)
                        viewData.push(translation.placehoder || this.placehoder)
                    }
                } else {//如果是提示字符 
                    viewData.push(el)
                    vmodelData.push(void 0)
                }
            }
            this.viewData = viewData
            this.vmodelData = vmodelData
        }
    }

    function getCaret(el) {
        var start = 0,
                end = 0
        if (typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
            start = el.selectionStart;
            end = el.selectionEnd;
        } else {
            var range = document.selection.createRange()
            if (range && range.parentElement() === el) {
                var len = el.value.length;
                var normalizedValue = el.value.replace(/\r?\n/g, "\n")

                var textInputRange = el.createTextRange()
                textInputRange.moveToBookmark(range.getBookmark())

                var endRange = el.createTextRange();
                endRange.collapse(false);

                if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
                    start = end = len
                } else {
                    start = -textInputRange.moveStart("character", -len)
                    start += normalizedValue.slice(0, start).split("\n").length - 1

                    if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
                        end = len
                    } else {
                        end = -textInputRange.moveEnd("character", -len)
                        end += normalizedValue.slice(0, end).split("\n").length - 1
                    }
                }
            }
        }
        return {
            start: start,
            end: end
        };
    }
    function setCaret(ctrl, start, end) {
        if (!ctrl.value || ctrl.readOnly)
            return
        if (!end) {
            end = start
        }
        if (ctrl.setSelectionRange) {
            ctrl.selectionStart = start
            ctrl.selectionEnd = end
            ctrl.focus()
        } else {
            var range = ctrl.createTextRange()
            range.collapse(true);
            range.moveStart("character", start)
            range.moveEnd("character", end - start)
            range.select()
        }
    }
})
/**
 * @other
 * data-duplex-mask-translations应该对应的一个对象，默认情况下已经有如下东西了：
 * <table class="table-doc" border="1">
 *     <colgroup>
 <col width="190" />
 </colgroup>
 *    <tr><th>元字符</th><th>意义</th></tr>
 *    <tr><td>0</td><td>表示任何数字，0-9，正则为/\d/， <code>可选</code>，即不匹配对最终结果也没关系</td></tr>
 *    <tr><td>9</td><td>表示任何数字，0-9，正则为/\d/</td></tr>
 *    <tr><td>A</td><td>表示任何字母，，正则为/[a-zA-Z]/</td></tr>
 *    <tr><td>*</td><td>表示任何非空字符，正则为/\S/</td></tr>
 * </table>
 * 
 */
/**
 @links
 [例子1](avalon.mask.ex1.html)
 [例子2](avalon.mask.ex2.html)
 */