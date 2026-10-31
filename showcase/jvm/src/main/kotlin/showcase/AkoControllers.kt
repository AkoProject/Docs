package showcase

import ako.rain.controller.IMenuController
import ako.rain.controller.IModelController
import rain.controller.annotation.Path
import smartweb.annotation.GetAction
import smartweb.annotation.WebController

@WebController
@Path("api/ako/auth")
class AuthController {
    // 演示环境不做登录校验
    @GetAction("isAuth")
    fun isAuth(): Boolean = true
}

@WebController
@Path("api/ako/menu")
class MenuController : IMenuController

@WebController
@Path("api/ako/model")
class ModelController : IModelController
