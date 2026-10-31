package showcase

import ako.rain.`fun`.findAccess
import ako.rain.`fun`.transaction
import rain.controller.annotation.Path
import smartweb.annotation.PatchAction
import smartweb.annotation.WebController

@WebController
@Path("api/showcase")
class ShowcaseController {

    private val orders = findAccess<ShopOrderAccess>()
    private val products = findAccess<ProductAccess>()

    @PatchAction("order/{id}/ship")
    fun ship(id: Int, carrier: Int, trackingNo: String) = transaction {
        val order = orders.get(id) ?: return@transaction
        order.status = 2
        orders.saveOrUpdate(order)
    }

    @PatchAction("order/{id}/refund")
    fun refund(id: Int) = transaction {
        val order = orders.get(id) ?: return@transaction
        order.status = 4
        orders.saveOrUpdate(order)
    }

    @PatchAction("product/{id}/off")
    fun off(id: Int) = transaction {
        val product = products.get(id) ?: return@transaction
        product.status = 2
        products.saveOrUpdate(product)
    }
}
