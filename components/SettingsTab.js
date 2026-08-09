'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { DeleteConfirmModal } from './Modals';
import AuditLogTab from './AuditLogTab';
import SessionsTab from './SessionsTab';

export default function SettingsTab() {
    const {
        appSettingsData,
        internListData,
        lecturerListData,
        platformsData,
        categoriesData,
        saveAppSetting,
        saveAppSettingsBatch,
        savePlatform,
        deletePlatform,
        saveCategory,
        deleteCategory,
        saveMember,
        deleteMember,
        setLecturerAttendeeVisibility,
        isUnlocked,
        userRole
    } = useDashboard();

    const [activeSubTab, setActiveSubTab] = useState(userRole === 'Creator' ? 'sessions' : 'general');
    const settingsTabs = userRole === 'Admin'
        ? ['general', 'members', 'lecturers', 'categories', 'audit', 'sessions']
        : ['sessions'];

    // General Settings States
    const [appName, setAppName] = useState('');
    const [appSubtitle, setAppSubtitle] = useState('');
    const [appFullName, setAppFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [appVersion, setAppVersion] = useState('');

    // Load initial General Settings values
    useEffect(() => {
        if (appSettingsData) {
            setAppName(appSettingsData.app_name || '');
            setAppSubtitle(appSettingsData.app_subtitle || '');
            setAppFullName(appSettingsData.app_full_name || '');
            setCompanyName(appSettingsData.company_name || '');
            setAppVersion(appSettingsData.app_version || '');
        }
    }, [appSettingsData]);

    // Modal / Form States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('member'); // 'member', 'platform', 'category'
    const [isEdit, setIsEdit] = useState(false);
    const [originalKey, setOriginalKey] = useState(''); // for editing member (oldNama)

    // Form inputs
    const [memberName, setMemberName] = useState('');
    const [memberStream, setMemberStream] = useState('');

    const [platformId, setPlatformId] = useState('');
    const [platformName, setPlatformName] = useState('');
    const [platformLogo, setPlatformLogo] = useState('');
    const [platformColor, setPlatformColor] = useState('');

    const [categoryName, setCategoryName] = useState('');
    const [categoryColor, setCategoryColor] = useState('');

    // Deletion states
    const [deleteTarget, setDeleteTarget] = useState(null); // { type, key }
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    if (!isUnlocked) {
        return <LockScreen sectionName="Settings" />;
    }

    // Submit General Settings
    const handleGeneralSubmit = async (e) => {
        e.preventDefault();
        await saveAppSettingsBatch({
            app_name: appName,
            app_subtitle: appSubtitle,
            app_full_name: appFullName,
            company_name: companyName,
            app_version: appVersion || 'v0.2.0-alpha'
        });
    };

    // Open Add Modals
    const openAddModal = (mode) => {
        setModalMode(mode);
        setIsEdit(false);
        setOriginalKey('');
        
        // Reset inputs
        setMemberName('');
        setMemberStream('');
        setPlatformId('');
        setPlatformName('');
        setPlatformLogo('');
        setPlatformColor('badge-platform-default');
        setCategoryName('');
        setCategoryColor('bg-blue-500/10 text-blue-400 border border-blue-500/20');

        setIsFormModalOpen(true);
    };

    // Open Edit Modals
    const openEditModal = (mode, item) => {
        setModalMode(mode);
        setIsEdit(true);

        if (mode === 'member') {
            setOriginalKey(item.NAMA);
            setMemberName(item.NAMA);
            setMemberStream(item.STREAM);
        } else if (mode === 'platform') {
            setOriginalKey(item.id);
            setPlatformId(item.id);
            setPlatformName(item.name);
            setPlatformLogo(item.logo_url || '');
            setPlatformColor(item.color_class || 'badge-platform-default');
        } else if (mode === 'category') {
            setOriginalKey(item.name);
            setCategoryName(item.name);
            setCategoryColor(item.color_class || 'bg-blue-500/10 text-blue-400 border border-blue-500/20');
        }

        setIsFormModalOpen(true);
    };

    // Handle Form Submit
    const handleModalSubmit = async (e) => {
        e.preventDefault();
        let success = false;

        if (modalMode === 'member') {
            success = await saveMember(isEdit ? originalKey : '', memberName, memberStream);
        } else if (modalMode === 'platform') {
            success = await savePlatform({
                id: isEdit ? platformId : platformName.trim().toLowerCase(),
                name: platformName,
                logo_url: platformLogo,
                color_class: platformColor
            });
        } else if (modalMode === 'category') {
            success = await saveCategory({
                name: categoryName,
                color_class: categoryColor
            });
        }

        if (success) {
            setIsFormModalOpen(false);
        }
    };

    // Trigger Deletion Confirmation
    const triggerDelete = (type, key) => {
        setDeleteTarget({ type, key });
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        let success = false;

        if (deleteTarget.type === 'member') {
            success = await deleteMember(deleteTarget.key);
        } else if (deleteTarget.type === 'platform') {
            success = await deletePlatform(deleteTarget.key);
        } else if (deleteTarget.type === 'category') {
            success = await deleteCategory(deleteTarget.key);
        }

        if (success) {
            setIsDeleteOpen(false);
            setDeleteTarget(null);
        }
    };

    return (
        <div className="space-y-6">

            {/* Settings subnavigation */}
            <div className="flex flex-wrap bg-surface-container-low border border-outline-variant/20 rounded-xl p-1 max-w-2xl">
                {settingsTabs.map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveSubTab(tab)}
                        className={`flex-1 py-1.5 px-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            activeSubTab === tab ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        {tab === 'members' ? 'Interns' : tab === 'audit' ? 'Audit Log' : tab}
                    </button>
                ))}
            </div>

            {/* 1. GENERAL BRANDING TAB */}
            {userRole === 'Admin' && activeSubTab === 'general' && (
                <div className="glass-panel border border-outline-variant/30 rounded-xl p-6 shadow-xl max-w-2xl space-y-6">
                    <h4 className="font-bold text-headline-sm text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">app_settings_alt</span> Branding & Metadata
                    </h4>

                    <form onSubmit={handleGeneralSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-body-sm font-semibold text-on-surface-variant">App Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                    value={appName}
                                    onChange={(e) => setAppName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-body-sm font-semibold text-on-surface-variant">App Subtitle</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                    value={appSubtitle}
                                    onChange={(e) => setAppSubtitle(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-body-sm font-semibold text-on-surface-variant">App Full Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                    value={appFullName}
                                    onChange={(e) => setAppFullName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-body-sm font-semibold text-on-surface-variant">Company/Team Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1 max-w-xs">
                            <div className="flex items-center justify-between">
                                <label className="text-body-sm font-semibold text-on-surface-variant">Version Label</label>
                                <span className="text-[10px] text-on-surface-variant/60 font-mono">(System Controlled)</span>
                            </div>
                            <input
                                type="text"
                                readOnly
                                disabled
                                className="w-full bg-surface-container-high/40 border border-outline-variant/20 rounded px-3 py-2 text-body-sm text-on-surface-variant font-mono cursor-not-allowed select-none opacity-80"
                                value={appVersion || 'v0.2.0-alpha'}
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2 px-5 rounded-lg text-body-sm transition-opacity cursor-pointer flex items-center gap-1.5 shadow-md shadow-primary/10"
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {userRole === 'Admin' && activeSubTab === 'lecturers' && (
                <div className="glass-panel border border-outline-variant/30 rounded-xl p-5 shadow-xl space-y-4">
                    <h4 className="font-bold text-body-lg text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">school</span> Lecturer Directory
                    </h4>
                    <div className="overflow-x-auto border border-outline-variant/20 rounded-xl">
                        <table className="w-full text-left border-collapse text-body-sm">
                            <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant/20">
                                <tr>
                                    <th className="px-5 py-4">Name</th>
                                    <th className="px-5 py-4">Role</th>
                                    <th className="px-5 py-4 text-center">Show in app</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10">
                                {lecturerListData.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-5 py-8 text-center text-on-surface-variant/60 italic">
                                            No users with the lecturer role were found.
                                        </td>
                                    </tr>
                                ) : lecturerListData.map((lecturer) => (
                                    <tr key={lecturer.id} className="hover:bg-surface-container-low/30 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-on-surface">{lecturer.name}</td>
                                        <td className="px-5 py-4 text-on-surface-variant capitalize">{lecturer.role}</td>
                                        <td className="px-5 py-4 text-center">
                                            <label className="inline-flex items-center justify-center gap-2 cursor-pointer text-[11px] text-on-surface-variant">
                                                <input
                                                    type="checkbox"
                                                    checked={lecturer.showInAttendees !== false}
                                                    onChange={(event) => setLecturerAttendeeVisibility(lecturer.id, event.target.checked)}
                                                    aria-label={`Show ${lecturer.name} in meeting attendees`}
                                                />
                                                <span>{lecturer.showInAttendees !== false ? 'Shown' : 'Hidden'}</span>
                                            </label>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 2. READ-ONLY INTERN DIRECTORY */}
            {userRole === 'Admin' && activeSubTab === 'members' && (
                <div className="glass-panel border border-outline-variant/30 rounded-xl p-5 shadow-xl space-y-4">
                    <div className="space-y-1">
                        <h4 className="font-bold text-body-lg text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">groups</span> Intern Directory
                        </h4>
                    </div>

                    <div className="overflow-x-auto border border-outline-variant/20 rounded-xl">
                        <table className="w-full text-left border-collapse text-body-sm">
                            <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant/20">
                                <tr>
                                    <th className="px-5 py-4">Name</th>
                                    <th className="px-5 py-4">Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10">
                                {internListData.length === 0 ? (
                                    <tr>
                                        <td colSpan="2" className="px-5 py-8 text-center text-on-surface-variant/60 italic">
                                            No users with the intern role were found.
                                        </td>
                                    </tr>
                                ) : internListData.map((intern) => (
                                    <tr key={intern.id} className="hover:bg-surface-container-low/30 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-on-surface">{intern.name}</td>
                                        <td className="px-5 py-4 text-on-surface-variant capitalize">{intern.role}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 4. CATEGORIES TAB */}
            {userRole === 'Admin' && activeSubTab === 'categories' && (
                <div className="glass-panel border border-outline-variant/30 rounded-xl p-5 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-body-lg text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">category</span> Content Categories
                        </h4>
                        <button
                            type="button"
                            onClick={() => openAddModal('category')}
                            className="bg-primary text-on-primary hover:opacity-90 font-semibold py-1.5 px-3 rounded-lg text-body-sm transition-opacity cursor-pointer flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span> Add Category
                        </button>
                    </div>

                    <div className="overflow-x-auto border border-outline-variant/20 rounded-xl">
                        <table className="w-full text-left border-collapse text-body-sm">
                            <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant/20">
                                <tr>
                                    <th className="px-5 py-4">Category Name</th>
                                    <th className="px-5 py-4">Preview Badge</th>
                                    <th className="px-5 py-4">Color</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10">
                                {categoriesData.map((cat) => (
                                    <tr key={cat.name} className="hover:bg-surface-container-low/30 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-on-surface">{cat.name}</td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-1 rounded text-[11px] font-semibold border ${cat.color_class}`}>
                                                {cat.name}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-on-surface-variant font-mono text-[11px]">{cat.color_class}</td>
                                        <td className="px-5 py-4 text-right flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal('category', cat)}
                                                className="text-primary hover:bg-primary/15 p-1 rounded transition-colors cursor-pointer"
                                                title="Edit category"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => triggerDelete('category', cat.name)}
                                                className="text-error hover:bg-error/15 p-1 rounded transition-colors cursor-pointer"
                                                title="Delete category"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {userRole === 'Admin' && activeSubTab === 'audit' && <AuditLogTab />}
            {activeSubTab === 'sessions' && <SessionsTab />}

            {/* ========================================================
               FORM INPUT MODAL FOR MEMBERS / PLATFORMS / CATEGORIES
               ======================================================== */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
                    <div className="w-full max-w-md bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
                            <h3 className="text-body-lg font-bold text-on-surface">
                                {isEdit ? 'Edit' : 'Add'} {modalMode === 'member' ? 'Member' : (modalMode === 'platform' ? 'Platform' : 'Category')}
                            </h3>
                            <button
                                type="button"
                                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                                onClick={() => setIsFormModalOpen(false)}
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleModalSubmit} className="flex-1 flex flex-col justify-between">
                            <div className="p-5 space-y-4">
                                {/* MEMBER FIELDS */}
                                {modalMode === 'member' && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-body-sm font-semibold text-on-surface-variant">Member Name</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                value={memberName}
                                                onChange={(e) => setMemberName(e.target.value)}
                                                placeholder="e.g. Charlie"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-body-sm font-semibold text-on-surface-variant">Role/Stream</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                                value={memberStream}
                                                onChange={(e) => setMemberStream(e.target.value)}
                                                placeholder="e.g. Content Creator"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* PLATFORM FIELDS */}
                                {modalMode === 'platform' && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-body-sm font-semibold text-on-surface-variant">Platform Name</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={isEdit} // don't change key on edit
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                                                value={platformName}
                                                onChange={(e) => setPlatformName(e.target.value)}
                                                placeholder="e.g. LinkedIn"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-body-sm font-semibold text-on-surface-variant">Logo Icon URL (Optional)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary font-mono text-[12px]"
                                                value={platformLogo}
                                                onChange={(e) => setPlatformLogo(e.target.value)}
                                                placeholder="e.g. /img/icons/linkedin.png"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-body-sm font-semibold text-on-surface-variant">CSS Class Name (Optional)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary font-mono text-[12px]"
                                                value={platformColor}
                                                onChange={(e) => setPlatformColor(e.target.value)}
                                                placeholder="e.g. badge-platform-linkedin"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* CATEGORY FIELDS */}
                                {modalMode === 'category' && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-body-sm font-semibold text-on-surface-variant">Category Name</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={isEdit}
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                                                value={categoryName}
                                                onChange={(e) => setCategoryName(e.target.value)}
                                                placeholder="e.g. Vlog"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-body-sm font-semibold text-on-surface-variant">Color</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary font-mono text-[12px]"
                                                value={categoryColor}
                                                onChange={(e) => setCategoryColor(e.target.value)}
                                                placeholder="e.g. bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="px-5 py-4 border-t border-outline-variant/20 flex justify-end gap-3 bg-surface-container-lowest">
                                <button
                                    type="button"
                                    className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-4 rounded-lg text-body-sm transition-colors cursor-pointer"
                                    onClick={() => setIsFormModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2 px-4 rounded-lg text-body-sm transition-opacity cursor-pointer flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[18px]">save</span> Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETION CONFIRMATION DIALOG */}
            <DeleteConfirmModal
                isOpen={isDeleteOpen}
                title={`Delete ${deleteTarget?.type === 'member' ? 'Member' : (deleteTarget?.type === 'platform' ? 'Platform' : 'Category')}`}
                message={`Are you sure you want to remove "${deleteTarget?.key}"? Related data references may be cleared or updated.`}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteOpen(false)}
            />
        </div>
    );
}
