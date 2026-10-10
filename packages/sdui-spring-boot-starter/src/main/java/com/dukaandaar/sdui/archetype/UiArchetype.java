package com.dukaandaar.sdui.archetype;

/**
 * Server-described UI archetypes. Endpoint fields name logical resources that the
 * host application's fetcher resolves and executes; packages never call them.
 */
public sealed interface UiArchetype
        permits TableArchetype, DashboardArchetype, FormArchetype,
                KanbanArchetype, CustomModuleArchetype, SubtabContainerArchetype {

    String typeCode();
}
