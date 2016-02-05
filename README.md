# BigMap




value 如果是Number类型, 可以使用 buffer.writeDoubleBE(num) 等方式写入.

冲突后的 step 应该根据 capacity 自适应选择.

capacity 应该能自动判断. 需要一个合理的 capacity 增长曲线 

set get 方法最好根据 Key / Value 类型由高阶函数生成
 
trimToString 的方式可能性能并不如直接 toString 后用正则处理.

可以选择是否 upgrade, upgrade 同步/异步

添加 query miss 的测试用例

完善 README


For BigMap:
keyLen
valLen
eleLen
keyType
valType
async
loadFactor
set
get

For MapBlock:

size
upgrade

capacity
_newMap
_threshold
_buf
step
extFragment
