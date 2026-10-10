package com.dukaandaar.sdui.archetype;

public record DashboardArchetype(String summaryEndpoint) implements UiArchetype {
    @Override
    public String typeCode() {
        return "DASHBOARD";
    }
}
