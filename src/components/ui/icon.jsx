'use client';

import React from 'react';
import * as PhosphorIcons from '@phosphor-icons/react/dist/ssr';

const ICON_MAP = {
    // Navigation & Layout
    dashboard: 'SquaresFour',
    dashboard_customize: 'SquaresFour',
    work_history: 'Briefcase',
    calendar: 'CalendarBlank',
    calendar_month: 'CalendarBlank',
    calendar_today: 'CalendarBlank',
    calendar_view_month: 'CalendarBlank',
    date_range: 'CalendarBlank',
    event_note: 'CalendarBlank',
    event_repeat: 'ArrowsClockwise',
    event_busy: 'CalendarX',
    assignment: 'ClipboardText',
    task_alt: 'CheckSquare',
    folder_open: 'FolderOpen',
    category: 'FolderSimple',
    description: 'FileText',
    analytics: 'ChartLineUp',
    insights: 'ChartLineUp',
    monitoring: 'ChartLineUp',
    timeline: 'ClockCounterClockwise',
    language: 'Globe',
    public: 'Globe',
    settings: 'Gear',
    app_settings_alt: 'Gear',
    tag: 'Tag',

    // Actions & Editing
    add: 'Plus',
    add_box: 'PlusSquare',
    edit: 'PencilSimple',
    edit_note: 'PencilSimple',
    edit_off: 'PencilSlash',
    delete: 'Trash',
    delete_clock: 'TrashSimple',
    restore: 'ArrowCounterClockwise',
    save: 'FloppyDisk',
    clear: 'X',
    close: 'X',
    repeat: 'ArrowsClockwise',
    sync: 'ArrowClockwise',
    cloud_sync: 'CloudArrowUp',
    restart_alt: 'ArrowClockwise',
    search: 'MagnifyingGlass',
    find_in_page: 'MagnifyingGlass',
    manage_search: 'MagnifyingGlass',
    filter_list: 'Funnel',
    download: 'DownloadSimple',
    content_copy: 'Copy',
    open_in_new: 'ArrowSquareOut',
    link: 'Link',
    link_off: 'LinkBreak',
    drag_indicator: 'DotsSixVertical',
    more_horiz: 'DotsThree',
    send: 'PaperPlaneRight',

    // Directional
    chevron_right: 'CaretRight',
    chevron_left: 'CaretLeft',
    arrow_forward: 'ArrowRight',
    arrow_upward: 'CaretUp',
    arrow_downward: 'CaretDown',
    unfold_more: 'CaretUpDown',

    // Feedback & Status
    check: 'Check',
    check_circle: 'CheckCircle',
    warning: 'Warning',
    error: 'WarningCircle',
    info: 'Info',
    help: 'Question',
    lock: 'Lock',
    lock_open: 'LockOpen',
    shield: 'ShieldCheck',
    admin_panel_settings: 'ShieldCheck',
    progress_activity: 'Spinner',
    wrong_location: 'MapPin',

    // Metrics & Charts
    trending_up: 'TrendUp',
    favorite: 'Heart',
    percent: 'Percent',
    bar_chart: 'ChartBar',
    pie_chart: 'ChartPie',
    bubble_chart: 'ChartPolar',
    trophy: 'Trophy',
    emoji_events: 'Trophy',
    workspace_premium: 'Trophy',
    grade: 'Star',
    star: 'Star',
    flag: 'Flag',

    // Content & Media
    videocam: 'VideoCamera',
    image: 'Image',
    campaign: 'Megaphone',
    palette: 'Palette',
    school: 'GraduationCap',
    inbox: 'Tray',
    devices: 'Devices',
    database: 'Database',
    route: 'Path',
    notifications: 'Bell',
    schedule: 'Clock',

    // User & Group
    account_circle: 'UserCircle',
    group: 'Users',
    groups: 'Users',
    person_add: 'UserPlus',

    // Formatting
    format_bold: 'TextB',
    format_italic: 'TextItalic',
    format_underlined: 'TextUnderline',
    format_list_bulleted: 'ListBullets',
    format_list_numbered: 'ListNumbers',
    format_align_left: 'TextAlignLeft',
    format_align_center: 'TextAlignCenter',
    format_align_right: 'TextAlignRight',

    // Themes
    light_mode: 'Sun',
    dark_mode: 'Moon',
    visibility: 'Eye',
    visibility_off: 'EyeSlash',
    handshake: 'Handshake'
};

export default function Icon({
    name,
    weight = 'regular',
    size = 18,
    className = '',
    'aria-hidden': ariaHidden = true,
    ...props
}) {
    if (!name) return null;

    const normalizedName = String(name).trim().toLowerCase();
    const componentName = ICON_MAP[normalizedName] || name;
    const Component = PhosphorIcons[componentName] || PhosphorIcons[name] || PhosphorIcons.Question;

    return (
        <Component
            size={size}
            weight={weight}
            className={className}
            aria-hidden={ariaHidden}
            {...props}
        />
    );
}
