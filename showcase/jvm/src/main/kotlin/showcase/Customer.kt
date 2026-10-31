package showcase

import ako.annotation.*
import ako.annotation.types.DbEnum
import ako.model.base.CompleteModel
import ako.rain.access.SoftDeleteAccess
import jakarta.persistence.Entity

@DbName("客户")
@MenuGroup(id = "trade", name = "交易中心", index = 20)
@Entity
data class Customer(
    @DbName("客户名称")
    @Required("请输入客户名称")
    @SearchType(SearchType.Type.Like)
    var name: String = "",

    @DbName("手机号")
    @RegExpValidate("^1\\d{10}$", message = "请输入 11 位手机号")
    var phone: String = "",

    @DbName("会员等级")
    @DbEnum("普通", "银卡", "金卡", "钻石")
    var level: Int = 0,

    @DbName("所在城市")
    var city: String = "",
) : CompleteModel()

interface CustomerAccess : SoftDeleteAccess<Customer, Int>
