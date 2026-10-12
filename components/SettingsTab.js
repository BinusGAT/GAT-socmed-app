'use client';

import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { useDashboard } from './DashboardContext';
import LockScreen from './LockScreen';
import { DeleteConfirmModal } from './Modals';
import AuditLogTab from './AuditLogTab';
import SessionsTab from './SessionsTab';
import { parseHiddenPostLibraryCategories, POST_LIBRARY_HIDDEN_CATEGORIES_KEY } from '../utils/postLibraryCategories';

export default function SettingsTab() {
    const {
        appSettingsData,
        internListData,
        lecturerListData,
        platformsData,
        categoriesData,
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
    const [hiddenLibraryCategories, setHiddenLibraryCategories] = useState([]);
    const [categoryVisibilityError, setCategoryVisibilityError] = useState('');

    useEffect(() => {
        setHiddenLibraryCategories(parseHiddenPostLibraryCategories(appSettingsData?.[POST_LIBRARY_HIDDEN_CATEGORIES_KEY]));
    }, [appSettingsData]);

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

    const toggleLibraryCategory = (categoryName) => {
        setCategoryVisibilityError('');
        setHiddenLibraryCategories((current) => {
            if (current.includes(categoryName)) {
                return current.filter((name) => name !== categoryName);
            }
            if (categoriesData.length - current.length <= 1) {
                setCategoryVisibilityError('At least one category must remain visible in the Post Library.');
                return current;
            }
            return [...current, categoryName];
        });
    };

    const saveLibraryCategoryVisibility = async () => {
        setCategoryVisibilityError('');
        await saveAppSettingsBatch({
            [POST_LIBRARY_HIDDEN_CATEGORIES_KEY]: JSON.stringify(hiddenLibraryCategories)
        });
    };

    return (
        <div className="space-y-6">

            {/* Settings subnavigation */}
            <div className="flex flex-wrap bg-muted/40 border border-border rounded-lg p-1 max-w-2xl gap-1">
                {settingsTabs.map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveSubTab(tab)}
                        className={`flex-1 py-1.5 px-2 text-center text-[10px] sm:text-xs font-medium uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                            activeSubTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab === 'members' ? 'Interns' : tab === 'audit' ? 'Audit Log' : tab}
                    </button>
                ))}
            </div>

            {/* 1. GENERAL BRANDING TAB */}
            {userRole === 'Admin' && activeSubTab === 'general' && (
                <div className="bg-surface border border-border rounded-lg p-6 max-w-2xl space-y-5">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <Icon name="app_settings_alt" size={16} className="text-primary" /> Branding & Metadata
                    </h4>

                    <form onSubmit={handleGeneralSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">App Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                    value={appName}
                                    onChange={(e) => setAppName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">App Subtitle</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                    value={appSubtitle}
                                    onChange={(e) => setAppSubtitle(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">App Full Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                    value={appFullName}
                                    onChange={(e) => setAppFullName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Company/Team Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1 max-w-xs">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Version Label</label>
                                <span className="text-[10px] text-muted-foreground/60 font-mono">(System Controlled)</span>
                            </div>
                            <input
                                type="text"
                                readOnly
                                disabled
                                className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-xs text-muted-foreground font-mono cursor-not-allowed select-none opacity-80"
                                value={appVersion || 'v0.2.0-alpha'}
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="bg-primary text-primary-foreground hover:opacity-90 font-medium py-2 px-4 rounded-md text-xs transition-opacity cursor-pointer flex items-center gap-1.5"
                            >
                                <Icon name="save" size={15} /> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {userRole === 'Admin' && activeSubTab === 'lecturers' && (
                <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <Icon name="school" size={16} className="text-primary" /> Lecturer Directory
                    </h4>
                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Name</th>
                                    <th className="px-4 py-2.5 font-medium">Role</th>
                                    <th className="px-4 py-2.5 text-center font-medium">Show in app</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {lecturerListData.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-8 text-center text-muted-foreground italic">
                                            No users with the lecturer role were found.
                                        </td>
                                    </tr>
                                ) : lecturerListData.map((lecturer) => (
                                    <tr key={lecturer.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">{lecturer.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground capitalize">{lecturer.role}</td>
                                        <td className="px-4 py-3 text-center">
                                            <label className="inline-flex items-center justify-center gap-2 cursor-pointer text-xs text-muted-foreground">
                                                <input
                                                    type="checkbox"
                                                    checked={lecturer.showInAttendees !== false}
                                                    onChange={(event) => setLecturerAttendeeVisibility(lecturer.id, event.target.checked)}
                                                    aria-label={`Show ${lecturer.name} in meeting attendees`}
                                                    className="rounded border-border bg-background text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
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
                <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
                    <div className="space-y-1">
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <Icon name="groups" size={16} className="text-primary" /> Intern Directory
                        </h4>
                    </div>

                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Full name</th>
                                    <th className="px-4 py-2.5 font-medium">Name</th>
                                    <th className="px-4 py-2.5 font-medium">Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {internListData.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-8 text-center text-muted-foreground italic">
                                            No users with the intern role were found.
                                        </td>
                                    </tr>
                                ) : internListData.map((intern) => (
                                    <tr key={intern.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">{intern.name}</td>
                                        <td className="px-4 py-3 font-medium text-foreground">{intern.name.trim().split(/\s+/)[0]}</td>
                                        <td className="px-4 py-3 text-muted-foreground capitalize">{intern.role}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 4. CATEGORIES TAB */}
            {userRole === 'Admin' && activeSubTab === 'categories' && (
                <section className="bg-surface border border-border rounded-lg p-5 space-y-4" aria-labelledby="content-categories-heading">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="space-y-1">
                            <h4 id="content-categories-heading" className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <Icon name="category" size={16} className="text-primary" /> Content Categories
                            </h4>
                            <p className="text-xs text-muted-foreground max-w-2xl">
                                Control which categories appear in the Post Library. Hiding a category does not delete its drafts.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => openAddModal('category')}
                            className="bg-primary text-primary-foreground hover:opacity-90 font-medium py-1.5 px-3 rounded-md text-xs transition-opacity cursor-pointer flex items-center gap-1.5"
                        >
                            <Icon name="add" size={14} /> Add Category
                        </button>
                    </div>

                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider border-b border-border">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Category Name</th>
                                    <th className="px-4 py-2.5 font-medium">Preview Badge</th>
                                    <th className="px-4 py-2.5 font-medium">Color</th>
                                    <th className="px-4 py-2.5 text-center font-medium">Post Library</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {categoriesData.map((cat) => (
                                    <tr key={cat.name} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">{cat.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cat.color_class}`}>
                                                {cat.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{cat.color_class}</td>
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={!hiddenLibraryCategories.includes(cat.name)}
                                                onChange={() => toggleLibraryCategory(cat.name)}
                                                className="rounded border-border bg-background text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                                aria-label={`Show ${cat.name} in Post Library`}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal('category', cat)}
                                                    className="text-primary hover:bg-primary/10 p-1 rounded-md transition-colors cursor-pointer"
                                                    title="Edit category"
                                                >
                                                    <Icon name="edit" size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => triggerDelete('category', cat.name)}
                                                    className="text-rose-500 hover:bg-rose-500/10 p-1 rounded-md transition-colors cursor-pointer"
                                                    title="Delete category"
                                                >
                                                    <Icon name="delete" size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {categoryVisibilityError && <p role="alert" className="text-xs text-rose-500">{categoryVisibilityError}</p>}
                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                        <button type="button" onClick={saveLibraryCategoryVisibility} className="bg-primary text-primary-foreground hover:opacity-90 font-medium py-1.5 px-3 rounded-md text-xs transition-opacity cursor-pointer">
                            Save visibility
                        </button>
                        <button type="button" onClick={() => { setHiddenLibraryCategories([]); setCategoryVisibilityError(''); }} className="text-muted-foreground hover:text-foreground font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer">
                            Show all categories
                        </button>
                    </div>
                </section>
            )}

            {userRole === 'Admin' && activeSubTab === 'audit' && <AuditLogTab />}
            {activeSubTab === 'sessions' && <SessionsTab />}

            {/* ========================================================
               FORM INPUT MODAL FOR MEMBERS / PLATFORMS / CATEGORIES
               ======================================================== */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
                    <div className="w-full max-w-md bg-surface border border-border rounded-lg overflow-hidden shadow-xl flex flex-col">
                        <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/20">
                            <h3 className="text-xs font-semibold text-foreground">
                                {isEdit ? 'Edit' : 'Add'} {modalMode === 'member' ? 'Member' : (modalMode === 'platform' ? 'Platform' : 'Category')}
                            </h3>
                            <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer transition-colors"
                                onClick={() => setIsFormModalOpen(false)}
                            >
                                <Icon name="close" size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleModalSubmit} className="flex-1 flex flex-col justify-between">
                            <div className="p-4 space-y-3.5">
                                {/* MEMBER FIELDS */}
                                {modalMode === 'member' && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Member Name</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                                                value={memberName}
                                                onChange={(e) => setMemberName(e.target.value)}
                                                placeholder="e.g. Charlie"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Role/Stream</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
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
                                            <label className="text-xs font-medium text-muted-foreground">Platform Name</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={isEdit} // don't change key on edit
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                                                value={platformName}
                                                onChange={(e) => setPlatformName(e.target.value)}
                                                placeholder="e.g. LinkedIn"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Logo Icon URL (Optional)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono transition-colors"
                                                value={platformLogo}
                                                onChange={(e) => setPlatformLogo(e.target.value)}
                                                placeholder="e.g. /img/icons/linkedin.png"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">CSS Class Name (Optional)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono transition-colors"
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
                                            <label className="text-xs font-medium text-muted-foreground">Category Name</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={isEdit}
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                                                value={categoryName}
                                                onChange={(e) => setCategoryName(e.target.value)}
                                                placeholder="e.g. Vlog"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Color</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono transition-colors"
                                                value={categoryColor}
                                                onChange={(e) => setCategoryColor(e.target.value)}
                                                placeholder="e.g. bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="px-4 py-3 border-t border-border flex justify-end gap-2 bg-muted/20">
                                <button
                                    type="button"
                                    className="bg-surface border border-border text-foreground hover:bg-muted font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer"
                                    onClick={() => setIsFormModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-primary text-primary-foreground hover:opacity-90 font-medium py-1.5 px-3 rounded-md text-xs transition-opacity cursor-pointer flex items-center gap-1.5"
                                >
                                    <Icon name="save" size={15} /> Save
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
