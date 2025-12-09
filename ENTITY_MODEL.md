# 实体模型说明

## 1. 枚举
以下枚举对于所有用户都是相同的：
- `transaction_type`：`支出` / `收入` / `转出` / `转入` / `应收款项` / `应付款项`
- `transaction_status`：`待处理` / `经自动处理取消` / `经自动处理填写` / `稍后处理` / `取消` / `附加到其他交易` / `已完成`

## 2. 共性约定
- 金额字段（如 `amount`）为非负值。

## 3. 账户配置

### `account`（账户）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | 账户主键，自增 |
| `user_id` | uuid | 所属用户 |
| `name` | text | 账户名称 |


### `budget_type`（预算计划）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | 预算类型主键，自增 |
| `user_id` | uuid | 所属用户 |
| `name` | text | 预算名称/计划 |


### `main_category`（主类别）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | 主类别主键，自增 |
| `user_id` | uuid | 所属用户 |
| `label` | text | 名称 |
| `icon` | text | 图标标识（emoji） |
| `back_color` / `fore_color` | text | 颜色配置<br />格式如 bg-yellow-100 dark:bg-yellow-900 |
| `transaction_type` | enum | 适用交易类型（见枚举） |

### `sub_category`（子类别）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | 子类别主键，自增 |
| `user_id` | uuid | 所属用户 |
| `main_category_id` | bigint FK | 关联主类别 |
| `label` | text | 名称 |
| `icon` | text | 图标标识（emoji） |
| `back_color` / `fore_color` | text | 颜色配置<br />格式如 bg-yellow-100 dark:bg-yellow-900 |
| `budget_type_id` | bigint FK 可空 | 可绑定预算类型 |

## 4. 交易记录与子记录

### `transaction`（交易）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | 主键（序列） |
| `user_id` | uuid | 所属用户 |
| `account_id` | bigint FK | 对应账户 |
| `budget_type_id` | bigint FK 可空 | 对应预算计划 |
| `main_category_id` / `sub_category_id` | bigint FK 可空 | 类别信息 |
| `original_amount` | numeric 可空 | 原始金额 - 导入 |
| `amount` | numeric | 记账金额（>=0） |
| `datetime` | timestamp 可空 | 发生时间 |
| `transaction_type` | enum 可空 | 交易类型 |
| `status` | enum 可空 | 处理状态 |
| `name` / `merchant` / `source` / `remark` / `title` | text 可空 | 描述信息 |
| `raw_info` | jsonb 可空 | 原始记录（导入源数据） |
| `parent_id` | bigint FK 可空 | 父交易（自关联，用于拆分） |

**用途**：核心交易记录，可单条记账或作为父交易承载分摊。  
**关系**：一对多到 `transaction_split`；可自关联（父子）。

## `transaction_split`（分摊/子交易）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | 主键（序列） |
| `user_id` | uuid | 所属用户 |
| `transaction_id` | bigint FK | 关联主交易 |
| `account_id` | bigint FK | 账户 |
| `budget_type_id` | bigint FK 可空 | 预算计划 |
| `main_category_id` / `sub_category_id` | bigint FK 可空 | 类别 |
| `amount` | numeric | 分摊金额（>=0） |
| `transaction_type` | enum 可空 | 交易类型 |
| `name` | text 可空 | 分摊名称 |



