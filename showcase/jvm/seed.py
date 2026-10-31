"""通过 Ako 标准的 model/save 接口写入演示数据。用法：python3 seed.py [http://localhost:17777/api/ako]"""
import json
import random
import sys
import time
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:17777/api/ako'
random.seed(20261030)


def post(path, body):
    req = urllib.request.Request(BASE + path, json.dumps(body).encode(), {'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        text = resp.read().decode()
        return json.loads(text) if text else None


def save(model, data):
    post(f'/model/save/{model}', data)


def ids(model):
    page = post(f'/model/page/{model}', {'page': 1, 'size': 1000, 'params': {}, 'sort': {}})
    return [e['id'] for e in page['entities']]


categories = [
    ('数码配件', '耳机、充电器、数据线等日常配件'),
    ('智能家居', '音箱、灯具、门锁等联网设备'),
    ('办公文具', '笔记本、收纳与桌面用品'),
    ('运动户外', '跑步、骑行与露营装备'),
    ('食品饮料', '咖啡、茶饮与休闲零食'),
    ('个护美妆', '洗护、香氛与护肤'),
]
for name, desc in categories:
    save('Category', {'name': name, 'description': desc})
cat_ids = ids('Category')

products = [
    ('降噪蓝牙耳机 Pro', 0, 899), ('65W 氮化镓快充', 0, 129), ('编织快充数据线 2m', 0, 39), ('磁吸无线充电板', 0, 159),
    ('智能音箱 mini', 1, 299), ('全彩智能灯泡', 1, 79), ('指纹密码门锁', 1, 1599), ('温湿度传感器', 1, 69),
    ('A5 点阵笔记本', 2, 25), ('桌面收纳托盘', 2, 59), ('静音无线鼠标', 2, 99), ('人体工学护腕垫', 2, 45),
    ('碳板竞速跑鞋', 3, 1299), ('骑行速干上衣', 3, 239), ('轻量折叠帐篷', 3, 699), ('户外保温水壶', 3, 149),
    ('云南小粒咖啡豆 500g', 4, 88), ('冷萃茶包 20 袋', 4, 49), ('每日坚果礼盒', 4, 129), ('低糖燕麦脆', 4, 35),
    ('氨基酸洗面奶', 5, 79), ('木质调香水 50ml', 5, 459), ('修护面霜', 5, 239), ('电动牙刷', 5, 349),
]
for name, cat, price in products:
    save('Product', {'name': name, 'category': cat_ids[cat], 'price': price,
                     'stock': random.choice([0, 3, 8, 12, 26, 58, 120, 340]), 'status': random.choice([1, 1, 1, 1, 0, 2])})
prod = list(zip(ids('Product'), [p[2] for p in products]))

surnames = '王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗'
given = ['子涵', '欣怡', '浩然', '雨桐', '宇轩', '梓萱', '思远', '一诺', '佳琪', '俊杰', '诗涵', '明轩']
cities = ['上海', '北京', '深圳', '杭州', '成都', '重庆', '南京', '武汉', '西安', '广州']
for i in range(28):
    save('Customer', {'name': random.choice(surnames) + random.choice(given), 'phone': '1' + str(random.randint(3000000000, 9999999999)),
                      'level': random.choice([0, 0, 0, 1, 1, 2, 3]), 'city': random.choice(cities)})
cust_ids = ids('Customer')

now = int(time.time() * 1000)
for i in range(136):
    pid, price = random.choice(prod)
    qty = random.choice([1, 1, 1, 2, 2, 3, 5])
    t = now - random.randint(0, 30 * 24 * 3600 * 1000)
    save('ShopOrder', {'orderNo': time.strftime('SO%Y%m%d', time.localtime(t / 1000)) + f'{1000 + i:04d}',
                       'customer': random.choice(cust_ids), 'product': pid, 'quantity': qty, 'amount': price * qty,
                       'status': random.choice([0, 1, 1, 2, 2, 3, 3, 3, 4]), 'orderedAt': t})

GB = 1000 ** 3
for i in range(14):
    quota = random.choice([50, 100, 200, 500, 1000, 2000]) * GB
    save('Storage', {'name': f'bucket-{random.choice(["media", "backup", "logs", "assets", "archive"])}-{i + 1:02d}',
                     'owner': random.choice(cust_ids), 'used': int(quota * random.uniform(0.05, 0.97)), 'quota': quota,
                     'expireAt': now + random.randint(10, 400) * 24 * 3600 * 1000})

print('done')
