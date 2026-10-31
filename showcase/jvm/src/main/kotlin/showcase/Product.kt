package showcase

import ako.annotation.*
import ako.annotation.types.DbEnum
import ako.annotation.types.Mapping
import ako.model.base.CompleteModel
import ako.rain.access.SoftDeleteAccess
import jakarta.persistence.Entity

@DbName("商品")
@MenuGroup(id = "goods", name = "商品中心", index = 10)
@OperateButton(name = "下架", url = "/api/showcase/product/\${id}/off", method = "PATCH", reconfirm = "确定下架这件商品吗？", type = "warning")
@Entity
data class Product(
    @DbName("商品名称")
    @Required("请输入商品名称")
    @SearchType(SearchType.Type.Like)
    @TableColumnWidth(240)
    var name: String = "",

    @DbName("分类")
    @Mapping(Category::class, display = "name")
    var category: Int = 0,

    @DbName("售价（元）")
    @RangeValidate(min = 1, message = "售价至少为 1 元")
    var price: Int = 0,

    @DbName("库存")
    @SearchType(SearchType.Type.LessEqual)
    @Description("搜索时返回库存小于等于该值的商品，方便补货")
    var stock: Int = 0,

    @DbName("状态")
    @DbEnum("草稿", "在售", "已下架")
    var status: Int = 0,
) : CompleteModel()

interface ProductAccess : SoftDeleteAccess<Product, Int>
