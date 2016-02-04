# BigMap




value 如果是Number类型, 可以使用 buffer.writeDoubleBE(num) 等方式写入.

冲突后的 step 应该根据 limit 自适应选择.

set get 方法最好根据 Key / Value 类型由高阶函数生成
 
trimToString 的方式可能性能并不如直接 toString 后用正则处理.

