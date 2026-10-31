package showcase

import ako.annotation.*
import ako.annotation.types.DbEnum
import ako.annotation.types.Datetime
import ako.annotation.types.Mapping
import ako.model.base.CompleteModel
import ako.rain.access.SoftDeleteAccess
import jakarta.persistence.Entity

@DbName("订单")
@MenuGroup(id = "trade", name = "交易中心", index = 20)
@ModelButton(
    name = "发货",
    type = "primary",
    panel = ButtonPanel(
        url = "/api/showcase/order/\${id}/ship",
        method = "PATCH",
        fields = [
            PanelField("carrier", name = DbName("物流公司"), nullable = false, enum = DbEnum("顺丰", "京东", "中通", "圆通")),
            PanelField("trackingNo", name = DbName("运单号"), nullable = false),
        ]
    )
)
@OperateButton(name = "退款", url = "/api/showcase/order/\${id}/refund", method = "PATCH", reconfirm = "确定为这笔订单退款吗？", type = "danger")
@Entity
data class ShopOrder(
    @DbName("订单号")
    @SearchType(SearchType.Type.Like)
    @TableColumnWidth(190)
    var orderNo: String = "",

    @DbName("客户")
    @Mapping(Customer::class, display = "name")
    @TableColumnWidth(110)
    var customer: Int = 0,

    @DbName("商品")
    @Mapping(Product::class, display = "name")
    @TableColumnWidth(190)
    var product: Int = 0,

    @DbName("数量")
    @TableColumnWidth(80)
    var quantity: Int = 1,

    @DbName("金额（元）")
    @SearchType(SearchType.Type.GreaterEqual)
    @TableColumnWidth(120)
    var amount: Int = 0,

    @DbName("状态")
    @DbEnum("待付款", "待发货", "已发货", "已完成", "已退款")
    @TableColumnWidth(100)
    var status: Int = 0,

    @DbName("下单时间")
    @Datetime
    @TableColumnWidth(180)
    var orderedAt: Long = 0,
) : CompleteModel()

interface ShopOrderAccess : SoftDeleteAccess<ShopOrder, Int>
