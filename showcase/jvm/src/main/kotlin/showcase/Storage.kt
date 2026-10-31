package showcase

import ako.annotation.*
import ako.annotation.types.BinarySize
import ako.annotation.types.DateOnly
import ako.annotation.types.Mapping
import ako.model.base.CompleteModel
import ako.rain.access.SoftDeleteAccess
import jakarta.persistence.Entity

@DbName("存储空间")
@MenuGroup(id = "ops", name = "运维中心", index = 30)
@Entity
data class Storage(
    @DbName("空间名称")
    @Required
    var name: String = "",

    @DbName("所属客户")
    @Mapping(Customer::class, display = "name")
    var owner: Int = 0,

    @DbName("已用容量")
    @BinarySize
    var used: Long = 0,

    @DbName("配额")
    @BinarySize
    var quota: Long = 0,

    @DbName("到期日")
    @field:DateOnly
    var expireAt: Long = 0,
) : CompleteModel()

interface StorageAccess : SoftDeleteAccess<Storage, Int>
