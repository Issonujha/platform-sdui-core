package com.dukaandaar.sdui.archetype;

import java.util.Map;

public record CustomModuleArchetype(String componentKey, String layoutMode, Map<String, Object> props)
        implements UiArchetype {
    @Override
    public String typeCode() {
        return "FULL_FRONTEND_IMPLEMENTATION";
    }
}
