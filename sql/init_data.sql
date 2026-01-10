INSERT INTO
    "public"."account" ("id", "user_id", "name")
VALUES
    ('1', '2715af65-8410-4cbb-b218-4a8205804571', '支付宝'),
    ('3', '2715af65-8410-4cbb-b218-4a8205804571', '微信支付'),
    ('4', '2715af65-8410-4cbb-b218-4a8205804571', '招商银行'),
    ('5', '2715af65-8410-4cbb-b218-4a8205804571', '中国银行'),
    ('6', '2715af65-8410-4cbb-b218-4a8205804571', '麦当劳钱包'),
    ('7', '2715af65-8410-4cbb-b218-4a8205804571', '肯德基钱包'),
    ('8', '2715af65-8410-4cbb-b218-4a8205804571', '交通卡(Watch)'),
    ('9', '2715af65-8410-4cbb-b218-4a8205804571', '交通卡(iPhone)'),
    ('10', '2715af65-8410-4cbb-b218-4a8205804571', '复旦校园卡');

INSERT INTO
    "public"."budget_type" ("id", "user_id", "name", "icon")
VALUES
    ('1', '2715af65-8410-4cbb-b218-4a8205804571', '基本开支', '📝'),
    ('2', '2715af65-8410-4cbb-b218-4a8205804571', '娱乐开支', '🎡'),
    ('3', '2715af65-8410-4cbb-b218-4a8205804571', '社交开支', '👥');

INSERT INTO
    "public"."main_category" (
        "id",
        "user_id",
        "label",
        "icon",
        "back_color",
        "fore_color",
        "transaction_type"
    )
VALUES
    (
        '12',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '饮食',
        '🍽️',
        'bg-yellow-100 dark:bg-yellow-900',
        'text-yellow-800 dark:text-yellow-200',
        '支出'
    ),
    (
        '13',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '娱乐',
        '🎮',
        'bg-pink-100 dark:bg-pink-900',
        'text-pink-800 dark:text-pink-200',
        '支出'
    ),
    (
        '14',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '购物/数码',
        '🛍️',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '支出'
    ),
    (
        '15',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '其他',
        '👥',
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-800 dark:text-gray-200',
        '支出'
    ),
    (
        '16',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '交通',
        '🚗',
        'bg-blue-100 dark:bg-blue-900',
        'text-blue-800 dark:text-blue-200',
        '支出'
    ),
    (
        '17',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '家居',
        '🏠',
        'bg-emerald-100 dark:bg-emerald-900',
        'text-emerald-800 dark:text-emerald-200',
        '支出'
    ),
    (
        '18',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '学习',
        '📚',
        'bg-purple-100 dark:bg-purple-900',
        'text-purple-800 dark:text-purple-200',
        '支出'
    ),
    (
        '19',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '旅行',
        '✈️',
        'bg-teal-100 dark:bg-teal-900',
        'text-teal-800 dark:text-teal-200',
        '支出'
    ),
    (
        '20',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '收入',
        '💼',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        '收入'
    ),
    (
        '21',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '转出',
        '📤',
        'bg-cyan-100 dark:bg-cyan-900',
        'text-cyan-800 dark:text-cyan-200',
        '转出'
    ),
    (
        '22',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '转入',
        '📥',
        'bg-cyan-100 dark:bg-cyan-900',
        'text-cyan-800 dark:text-cyan-200',
        '转入'
    ),
    (
        '23',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '应收款项',
        '🧾',
        'bg-violet-100 dark:bg-violet-900',
        'text-violet-800 dark:text-violet-200',
        '应收款项'
    ),
    (
        '24',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '应付款项',
        '🏦',
        'bg-orange-100 dark:bg-orange-900',
        'text-orange-800 dark:text-orange-200',
        '应付款项'
    );


INSERT INTO
    "public"."sub_category" (
        "id",
        "user_id",
        "main_category_id",
        "label",
        "icon",
        "back_color",
        "fore_color",
        "budget_type_id"
    )
VALUES
    (
        '1',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '12',
        '早餐',
        '🥞',
        'bg-yellow-100 dark:bg-yellow-900',
        'text-yellow-800 dark:text-yellow-200',
        '1'
    ),
    (
        '2',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '12',
        '午餐',
        '🍱',
        'bg-yellow-100 dark:bg-yellow-900',
        'text-yellow-800 dark:text-yellow-200',
        '1'
    ),
    (
        '3',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '12',
        '晚餐',
        '🍽️',
        'bg-yellow-100 dark:bg-yellow-900',
        'text-yellow-800 dark:text-yellow-200',
        '1'
    ),
    (
        '4',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '12',
        '点心',
        '🧁',
        'bg-yellow-100 dark:bg-yellow-900',
        'text-yellow-800 dark:text-yellow-200',
        '2'
    ),
    (
        '5',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '12',
        '夜宵',
        '🍜',
        'bg-yellow-100 dark:bg-yellow-900',
        'text-yellow-800 dark:text-yellow-200',
        '2'
    ),
    (
        '6',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '12',
        '零食',
        '🍿',
        'bg-yellow-100 dark:bg-yellow-900',
        'text-yellow-800 dark:text-yellow-200',
        '2'
    ),
    (
        '7',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '12',
        '饮料',
        '🥤',
        'bg-yellow-100 dark:bg-yellow-900',
        'text-yellow-800 dark:text-yellow-200',
        '1'
    ),
    (
        '8',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '13',
        '外出吃饭',
        '🍴',
        'bg-pink-100 dark:bg-pink-900',
        'text-pink-800 dark:text-pink-200',
        '2'
    ),
    (
        '9',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '13',
        '聚会/唱歌',
        '🎤',
        'bg-pink-100 dark:bg-pink-900',
        'text-pink-800 dark:text-pink-200',
        '2'
    ),
    (
        '10',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '13',
        '密室/轰趴/剧本杀',
        '🔍',
        'bg-pink-100 dark:bg-pink-900',
        'text-pink-800 dark:text-pink-200',
        '2'
    ),
    (
        '11',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '13',
        '电影',
        '🎬',
        'bg-pink-100 dark:bg-pink-900',
        'text-pink-800 dark:text-pink-200',
        '2'
    ),
    (
        '12',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '13',
        '游乐园',
        '🎢',
        'bg-pink-100 dark:bg-pink-900',
        'text-pink-800 dark:text-pink-200',
        '2'
    ),
    (
        '13',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '13',
        '咖啡馆',
        '☕',
        'bg-pink-100 dark:bg-pink-900',
        'text-pink-800 dark:text-pink-200',
        '2'
    ),
    (
        '14',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '14',
        '日用品',
        '🧼',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '1'
    ),
    (
        '15',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '14',
        '衣物',
        '👕',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '2'
    ),
    (
        '16',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '14',
        '鞋子',
        '👟',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '2'
    ),
    (
        '17',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '14',
        '配饰',
        '💍',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '2'
    ),
    (
        '18',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '14',
        '箱包',
        '🎒',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '2'
    ),
    (
        '19',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '14',
        '护肤/美妆',
        '💄',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '2'
    ),
    (
        '20',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '14',
        '数码产品',
        '📱',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '2'
    ),
    (
        '21',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '14',
        '应用软件',
        '📲',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '2'
    ),
    (
        '22',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '14',
        '游戏',
        '🎮',
        'bg-indigo-100 dark:bg-indigo-900',
        'text-indigo-800 dark:text-indigo-200',
        '2'
    ),
    (
        '23',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '15',
        '社交A',
        '💝',
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-800 dark:text-gray-200',
        '3'
    ),
    (
        '24',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '15',
        '社交B',
        '🎊',
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-800 dark:text-gray-200',
        '3'
    ),
    (
        '25',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '15',
        '社交C',
        '🏡',
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-800 dark:text-gray-200',
        '3'
    ),
    (
        '26',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '15',
        '社交D',
        '🛸',
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-800 dark:text-gray-200',
        '3'
    ),
    (
        '27',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '15',
        '社交K',
        '💕',
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-800 dark:text-gray-200',
        '3'
    ),
    (
        '28',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '15',
        '其他',
        '📋',
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-800 dark:text-gray-200',
        '3'
    ),
    (
        '29',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '16',
        '自行车',
        '🚲',
        'bg-blue-100 dark:bg-blue-900',
        'text-blue-800 dark:text-blue-200',
        '1'
    ),
    (
        '30',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '16',
        '公共交通',
        '🚌',
        'bg-blue-100 dark:bg-blue-900',
        'text-blue-800 dark:text-blue-200',
        '1'
    ),
    (
        '31',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '16',
        '出租车',
        '🚕',
        'bg-blue-100 dark:bg-blue-900',
        'text-blue-800 dark:text-blue-200',
        '1'
    ),
    (
        '32',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '17',
        '水费',
        '💧',
        'bg-emerald-100 dark:bg-emerald-900',
        'text-emerald-800 dark:text-emerald-200',
        '1'
    ),
    (
        '33',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '17',
        '电费',
        '⚡',
        'bg-emerald-100 dark:bg-emerald-900',
        'text-emerald-800 dark:text-emerald-200',
        '1'
    ),
    (
        '34',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '17',
        '家具',
        '🪑',
        'bg-emerald-100 dark:bg-emerald-900',
        'text-emerald-800 dark:text-emerald-200',
        '1'
    ),
    (
        '35',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '17',
        '清扫',
        '🧽',
        'bg-emerald-100 dark:bg-emerald-900',
        'text-emerald-800 dark:text-emerald-200',
        '1'
    ),
    (
        '36',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '17',
        '洗衣',
        '👔',
        'bg-emerald-100 dark:bg-emerald-900',
        'text-emerald-800 dark:text-emerald-200',
        '1'
    ),
    (
        '37',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '18',
        '教材',
        '📖',
        'bg-purple-100 dark:bg-purple-900',
        'text-purple-800 dark:text-purple-200',
        '1'
    ),
    (
        '38',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '18',
        '课程',
        '🎓',
        'bg-purple-100 dark:bg-purple-900',
        'text-purple-800 dark:text-purple-200',
        '1'
    ),
    (
        '39',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '18',
        '图书',
        '📚',
        'bg-purple-100 dark:bg-purple-900',
        'text-purple-800 dark:text-purple-200',
        '1'
    ),
    (
        '40',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '18',
        '证书',
        '🏆',
        'bg-purple-100 dark:bg-purple-900',
        'text-purple-800 dark:text-purple-200',
        '1'
    ),
    (
        '41',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '18',
        '打印',
        '🖨️',
        'bg-purple-100 dark:bg-purple-900',
        'text-purple-800 dark:text-purple-200',
        '1'
    ),
    (
        '42',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '18',
        '文具',
        '✏️',
        'bg-purple-100 dark:bg-purple-900',
        'text-purple-800 dark:text-purple-200',
        '1'
    ),
    (
        '43',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '19',
        '机票/火车票',
        '🚄',
        'bg-teal-100 dark:bg-teal-900',
        'text-teal-800 dark:text-teal-200',
        '2'
    ),
    (
        '44',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '19',
        '酒店',
        '🏨',
        'bg-teal-100 dark:bg-teal-900',
        'text-teal-800 dark:text-teal-200',
        '2'
    ),
    (
        '45',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '19',
        '吃饭',
        '🍽️',
        'bg-teal-100 dark:bg-teal-900',
        'text-teal-800 dark:text-teal-200',
        '2'
    ),
    (
        '46',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '19',
        '甜品饮料',
        '🧁',
        'bg-teal-100 dark:bg-teal-900',
        'text-teal-800 dark:text-teal-200',
        '2'
    ),
    (
        '47',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '19',
        '门票',
        '🎫',
        'bg-teal-100 dark:bg-teal-900',
        'text-teal-800 dark:text-teal-200',
        '2'
    ),
    (
        '48',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '19',
        '其他交通',
        '🚐',
        'bg-teal-100 dark:bg-teal-900',
        'text-teal-800 dark:text-teal-200',
        '2'
    ),
    (
        '49',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '19',
        '其他费用',
        '💳',
        'bg-teal-100 dark:bg-teal-900',
        'text-teal-800 dark:text-teal-200',
        '2'
    ),
    (
        '50',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '20',
        '生活费',
        '🏠',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        null
    ),
    (
        '51',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '20',
        '红包',
        '🧧',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        null
    ),
    (
        '52',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '20',
        '工资',
        '💰',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        null
    ),
    (
        '53',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '20',
        '补助',
        '🎁',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        null
    ),
    (
        '54',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '20',
        '投资',
        '📈',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        null
    ),
    (
        '55',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '20',
        '闲鱼',
        '🛍️',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        null
    ),
    (
        '56',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '20',
        '退款',
        '↩️',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        null
    ),
    (
        '57',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '20',
        '其他',
        '📋',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        null
    ),
    (
        '58',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '20',
        '优惠',
        '🏷️',
        'bg-red-100 dark:bg-red-900',
        'text-red-800 dark:text-red-200',
        null
    ),
    (
        '59',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '21',
        '转出',
        '📤',
        'bg-cyan-100 dark:bg-cyan-900',
        'text-cyan-800 dark:text-cyan-200',
        null
    ),
    (
        '60',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '22',
        '转入',
        '📥',
        'bg-cyan-100 dark:bg-cyan-900',
        'text-cyan-800 dark:text-cyan-200',
        null
    ),
    (
        '61',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '23',
        '报账',
        '🧾',
        'bg-violet-100 dark:bg-violet-900',
        'text-violet-800 dark:text-violet-200',
        null
    ),
    (
        '62',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '23',
        '预付',
        '💳',
        'bg-violet-100 dark:bg-violet-900',
        'text-violet-800 dark:text-violet-200',
        null
    ),
    (
        '63',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '23',
        '应发工资',
        '💼',
        'bg-violet-100 dark:bg-violet-900',
        'text-violet-800 dark:text-violet-200',
        null
    ),
    (
        '64',
        '2715af65-8410-4cbb-b218-4a8205804571',
        '24',
        '借入',
        '🤝',
        'bg-orange-100 dark:bg-orange-900',
        'text-orange-800 dark:text-orange-200',
        null
    );