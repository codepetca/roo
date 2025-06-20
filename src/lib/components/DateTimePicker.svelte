<script lang="ts">
  import Icon from './Icon.svelte'

  type DateTimePickerMode = 'date' | 'time' | 'datetime'

  let {
    value = $bindable(),
    mode = 'date' as DateTimePickerMode,
    placeholder = '',
    disabled = false,
    required = false,
    class: className = '',
    id = '',
    name = '',
    ...props
  }: {
    value?: Date | null
    mode?: DateTimePickerMode
    placeholder?: string
    disabled?: boolean
    required?: boolean
    class?: string
    id?: string
    name?: string
    [key: string]: any
  } = $props()

  let isOpen = $state(false)
  let pickerRef: HTMLDivElement
  let inputRef: HTMLInputElement
  
  // Calendar state
  let currentMonth = $state(new Date())
  let selectedDate = $state<Date | null>(value || null)
  let selectedTime = $state({ hours: 12, minutes: 0 })

  // Initialize time from value if provided
  $effect(() => {
    if (value) {
      selectedDate = new Date(value)
      selectedTime = {
        hours: value.getHours(),
        minutes: value.getMinutes()
      }
      currentMonth = new Date(value.getFullYear(), value.getMonth(), 1)
    }
  })

  // Update value when selection changes
  $effect(() => {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      if (mode === 'datetime' || mode === 'time') {
        newDate.setHours(selectedTime.hours, selectedTime.minutes, 0, 0)
      }
      value = newDate
    } else {
      value = null
    }
  })

  function togglePicker() {
    if (disabled) return
    isOpen = !isOpen
  }

  function closePicker() {
    isOpen = false
  }

  function handleOutsideClick(event: MouseEvent) {
    if (pickerRef && !pickerRef.contains(event.target as Node) && 
        inputRef && !inputRef.contains(event.target as Node)) {
      closePicker()
    }
  }

  function formatDisplayValue(): string {
    if (!value) return ''
    
    const options: Intl.DateTimeFormatOptions = {}
    
    if (mode === 'date' || mode === 'datetime') {
      options.year = 'numeric'
      options.month = 'short'
      options.day = 'numeric'
    }
    
    if (mode === 'time' || mode === 'datetime') {
      options.hour = 'numeric'
      options.minute = '2-digit'
    }
    
    return value.toLocaleDateString('en-US', options)
  }

  function generateCalendarDays(): (Date | null)[] {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startCalendar = new Date(firstDay)
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay())
    
    const days: (Date | null)[] = []
    
    // Add days from previous month
    for (let i = 0; i < firstDay.getDay(); i++) {
      const day = new Date(startCalendar)
      day.setDate(day.getDate() + i)
      days.push(day)
    }
    
    // Add days from current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }
    
    // Add days from next month to fill the grid
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day))
    }
    
    return days
  }

  function selectDate(date: Date) {
    selectedDate = new Date(date)
    
    if (mode === 'date') {
      closePicker()
    }
  }

  function isDateSelected(date: Date): boolean {
    return selectedDate ? 
      date.toDateString() === selectedDate.toDateString() : false
  }

  function isDateInCurrentMonth(date: Date): boolean {
    return date.getMonth() === currentMonth.getMonth()
  }

  function isToday(date: Date): boolean {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  function navigateMonth(direction: 'prev' | 'next') {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1))
    currentMonth = newMonth
  }

  function updateTime(type: 'hours' | 'minutes', value: number) {
    selectedTime = { ...selectedTime, [type]: value }
  }

  function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      togglePicker()
    } else if (event.key === 'Escape') {
      closePicker()
    }
  }

  // Close picker when clicking outside
  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleOutsideClick)
      return () => document.removeEventListener('click', handleOutsideClick)
    }
  })

  const calendarDays = $derived(generateCalendarDays())
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
</script>

<div class="relative">
  <!-- Input field -->
  <div class="relative">
    <input
      bind:this={inputRef}
      type="text"
      readonly
      {placeholder}
      {disabled}
      {required}
      {id}
      {name}
      value={formatDisplayValue()}
      onclick={togglePicker}
      onkeydown={handleInputKeydown}
      class="input pr-10 cursor-pointer {className}"
      {...props}
    />
    <button
      type="button"
      onclick={togglePicker}
      {disabled}
      class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
      aria-label="Open date picker"
    >
      {#if mode === 'time'}
        <Icon name="clock" size="sm" />
      {:else}
        <Icon name="calendar-days" size="sm" />
      {/if}
    </button>
  </div>

  <!-- Picker dropdown -->
  {#if isOpen}
    <div
      bind:this={pickerRef}
      class="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4 min-w-80"
    >
      {#if mode === 'date' || mode === 'datetime'}
        <!-- Calendar header -->
        <div class="flex items-center justify-between mb-4">
          <button
            type="button"
            onclick={() => navigateMonth('prev')}
            class="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Previous month"
          >
            <Icon name="chevron-up" size="sm" class="rotate-[-90deg]" />
          </button>
          
          <h3 class="text-sm font-semibold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          
          <button
            type="button"
            onclick={() => navigateMonth('next')}
            class="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Next month"
          >
            <Icon name="chevron-up" size="sm" class="rotate-90" />
          </button>
        </div>

        <!-- Calendar grid -->
        <div class="grid grid-cols-7 gap-1 mb-4">
          <!-- Week day headers -->
          {#each weekDays as day}
            <div class="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
              {day}
            </div>
          {/each}
          
          <!-- Calendar days -->
          {#each calendarDays as day}
            {#if day}
              <button
                type="button"
                onclick={() => selectDate(day)}
                class="h-8 w-8 rounded-lg text-sm transition-all duration-200 flex items-center justify-center
                  {isDateSelected(day) 
                    ? 'bg-gray-900 text-white' 
                    : isToday(day)
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : isDateInCurrentMonth(day)
                        ? 'text-gray-900 hover:bg-gray-100'
                        : 'text-gray-400 hover:bg-gray-50'
                  }"
              >
                {day.getDate()}
              </button>
            {:else}
              <div class="h-8 w-8"></div>
            {/if}
          {/each}
        </div>
      {/if}

      {#if mode === 'time' || mode === 'datetime'}
        <!-- Time picker -->
        <div class="border-t border-gray-100 pt-4">
          <div class="flex items-center justify-center space-x-2">
            <!-- Hours -->
            <div class="flex flex-col items-center">
              <label class="text-xs text-gray-500 mb-1">Hours</label>
              <select
                bind:value={selectedTime.hours}
                class="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {#each Array(24).fill(0) as _, hour}
                  <option value={hour}>{hour.toString().padStart(2, '0')}</option>
                {/each}
              </select>
            </div>

            <div class="text-gray-400 mt-6">:</div>

            <!-- Minutes -->
            <div class="flex flex-col items-center">
              <label class="text-xs text-gray-500 mb-1">Minutes</label>
              <select
                bind:value={selectedTime.minutes}
                class="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {#each Array(60).fill(0) as _, minute}
                  <option value={minute}>{minute.toString().padStart(2, '0')}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
      {/if}

      <!-- Action buttons -->
      <div class="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
        <button
          type="button"
          onclick={closePicker}
          class="btn btn-secondary btn-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={closePicker}
          class="btn btn-primary btn-sm"
        >
          Done
        </button>
      </div>
    </div>
  {/if}
</div>