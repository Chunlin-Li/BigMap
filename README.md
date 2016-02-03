# BigMap


value 如果是Number类型, 可以使用 buffer.writeDoubleBE(num) 等方式写入. 

如果数据过多, 需要进行自动扩展, 数据 rehash 到新的 Buffer 中.   loadFactor 参考 Java 的 hashmap 0.75

