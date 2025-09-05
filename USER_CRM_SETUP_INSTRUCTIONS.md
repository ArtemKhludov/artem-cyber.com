# 🎯 Инструкции по настройке CRM-системы с карточками пользователей

## 📋 Что нужно сделать:

### 1. **Создать таблицы в базе данных**

Выполните следующие SQL-скрипты в Supabase:

```sql
-- 1. Сначала выполните create_users_table_simple.sql
-- 2. Затем выполните modify_existing_tables_correct.sql
-- 3. Наконец выполните create_views_correct.sql
```

**Как выполнить:**
1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Скопируйте и выполните содержимое `create_users_table_simple.sql`
4. Затем скопируйте и выполните содержимое `modify_existing_tables_correct.sql`
5. Наконец скопируйте и выполните содержимое `create_views_correct.sql`

### 2. **Добавить вкладку "Пользователи" в CRM**

Нужно модифицировать `app/admin/page.tsx`:

```typescript
// Добавить новую вкладку в массив tabs
const tabs = [
  { id: 'requests', label: 'Заявки', icon: MessageSquare },
  { id: 'purchases', label: 'Покупки', icon: ShoppingCart },
  { id: 'users', label: 'Пользователи', icon: Users }, // НОВАЯ ВКЛАДКА
]

// Добавить импорт компонентов
import { UsersList } from '@/components/admin/UsersList'
import { UserCard } from '@/components/admin/UserCard'

// Добавить состояния для пользователей
const [selectedUser, setSelectedUser] = useState<User | null>(null)
const [showUserCard, setShowUserCard] = useState(false)

// Добавить обработчики
const handleUserSelect = (user: User) => {
  setSelectedUser(user)
  setShowUserCard(true)
}

const handleUserEdit = (user: User) => {
  setSelectedUser(user)
  setShowUserCard(true)
}

const handleUserDelete = async (userId: string) => {
  if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        // Обновить список пользователей
        fetchUsers()
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }
}

// В рендере добавить новую вкладку
{activeTab === 'users' && (
  <UsersList
    onUserSelect={handleUserSelect}
    onUserEdit={handleUserEdit}
    onUserDelete={handleUserDelete}
  />
)}

// Добавить модальное окно карточки пользователя
{showUserCard && selectedUser && (
  <UserCard
    userId={selectedUser.id}
    onClose={() => {
      setShowUserCard(false)
      setSelectedUser(null)
    }}
    onUserUpdate={(updatedUser) => {
      setSelectedUser(updatedUser)
      // Обновить список пользователей
      fetchUsers()
    }}
  />
)}
```

### 3. **Модифицировать существующие API**

Нужно обновить `app/api/callback/route.ts` для автоматического создания пользователей:

```typescript
// Добавить функцию для создания/поиска пользователя
async function findOrCreateUser(name: string, phone: string, email?: string, source?: string) {
  const supabase = getSupabaseAdmin()
  
  // Ищем существующего пользователя
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single()
  
  if (existingUser) {
    return existingUser.id
  }
  
  // Создаем нового пользователя
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      name,
      email,
      phone,
      source: source || 'callback'
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('Error creating user:', error)
    return null
  }
  
  return newUser.id
}

// В функции POST добавить создание пользователя
const userId = await findOrCreateUser(name, phone, email, source_page)

// Добавить user_id в данные заявки
const requestData = {
  name,
  email,
  phone,
  message,
  preferred_time,
  source_page,
  product_type,
  product_name,
  notes,
  user_id // ДОБАВИТЬ ЭТО ПОЛЕ
}
```

### 4. **Добавить импорты в admin/page.tsx**

```typescript
import { Users } from 'lucide-react' // Добавить иконку Users
```

## 🚀 Результат:

После выполнения всех шагов у вас будет:

1. **Таблица пользователей** с полной информацией
2. **Автоматическое связывание** заявок и покупок с пользователями
3. **Вкладка "Пользователи"** в CRM-системе
4. **Карточка пользователя** с полной историей
5. **Статистика** по каждому пользователю
6. **Возможность редактирования** данных пользователя

## 📊 Структура данных:

- **users** - основная таблица пользователей
- **pdf_requests.user_id** - связь заявок с пользователями
- **purchase_requests.user_id** - связь покупок с пользователями
- **user_activity** - представление для истории активности
- **user_profile** - представление для полной информации

## 🔄 Автоматические функции:

- **Автоматическое создание** пользователей при новых заявках
- **Автоматическое обновление** статистики
- **Автоматическое связывание** заявок и покупок
- **Автоматическое обновление** времени последней активности

## 💾 Хранение данных:

- **Основная информация** пользователя хранится постоянно
- **История активности** ограничена последними 50 записями
- **Комментарии менеджера** хранятся постоянно
- **Статистика** обновляется автоматически

## 🎯 Следующие шаги:

1. Выполните SQL-скрипты
2. Модифицируйте admin/page.tsx
3. Обновите API callback
4. Протестируйте функциональность
5. Добавьте интеграцию с личным кабинетом пользователя
