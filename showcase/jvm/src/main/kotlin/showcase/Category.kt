package showcase

import ako.annotation.*
import ako.model.base.CompleteModel
import ako.rain.access.SoftDeleteAccess
import jakarta.persistence.Entity

@DbName("商品分类")
@MenuGroup(id = "goods", name = "商品中心", index = 10)
@Entity
data class Category(
    @DbName("分类名称")
    @Required("请输入分类名称")
    var name: String = "",

    @DbName("说明")
    @SearchIgnore
    @TableColumnWidth(360)
    var description: String = "",
) : CompleteModel()

interface CategoryAccess : SoftDeleteAccess<Category, Int>
