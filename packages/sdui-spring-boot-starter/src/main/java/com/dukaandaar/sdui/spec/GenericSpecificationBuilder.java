package com.dukaandaar.sdui.spec;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Map;
import java.util.Set;

import org.springframework.data.jpa.domain.Specification;

import com.dukaandaar.sdui.contract.DataTableRequest;
import com.dukaandaar.sdui.parser.DateRangeParser;

/**
 * Reusable, dependency-light JPA {@link Specification} helpers. Contains no outbound
 * HTTP calls and no knowledge of any specific entity — the host passes field names.
 */
public final class GenericSpecificationBuilder {

    private GenericSpecificationBuilder() {
    }

    public static <T> Specification<T> equality(String field, Object value) {
        return (root, query, cb) -> value == null ? cb.conjunction() : cb.equal(root.get(field), value);
    }

    public static <T> Specification<T> in(String field, Collection<?> values) {
        return (root, query, cb) -> (values == null || values.isEmpty()) ? cb.conjunction()
                : root.get(field).in(values);
    }

    public static <T> Specification<T> like(String field, String value) {
        return (root, query, cb) -> {
            if (value == null || value.isBlank()) {
                return cb.conjunction();
            }
            return cb.like(cb.lower(root.get(field).as(String.class)), "%" + value.trim().toLowerCase() + "%");
        };
    }

    public static <T> Specification<T> between(String field, LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) {
                return cb.conjunction();
            }
            if (from != null && to != null) {
                return cb.between(root.<LocalDateTime>get(field), from, to);
            }
            if (from != null) {
                return cb.greaterThanOrEqualTo(root.<LocalDateTime>get(field), from);
            }
            return cb.lessThanOrEqualTo(root.<LocalDateTime>get(field), to);
        };
    }

    /**
     * Builds a specification from a {@link DataTableRequest}.
     *
     * <ul>
     *   <li>free-text {@code search} scans every field in {@code searchableFields};</li>
     *   <li>filter key {@code <field>From} / {@code <field>To} → date range on {@code field};</li>
     *   <li>collection value → {@code IN}; string → {@code LIKE}; otherwise equality.</li>
     * </ul>
     * Only fields in {@code allowedFields} are honoured (never trust raw client field names).
     */
    public static <T> Specification<T> fromRequest(
            DataTableRequest request, Set<String> allowedFields, Collection<String> searchableFields) {

        Specification<T> spec = (root, query, cb) -> cb.conjunction();

        if (request.search() != null && !request.search().isBlank() && searchableFields != null) {
            Specification<T> searchSpec = null;
            for (String field : searchableFields) {
                if (!allowedFields.contains(field)) {
                    continue;
                }
                Specification<T> part = like(field, request.search());
                searchSpec = (searchSpec == null) ? part : searchSpec.or(part);
            }
            if (searchSpec != null) {
                spec = spec.and(searchSpec);
            }
        }

        for (Map.Entry<String, Object> entry : request.filters().entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if (value == null) {
                continue;
            }

            boolean fromBound = key.endsWith("From");
            boolean toBound = key.endsWith("To");
            if (fromBound || toBound) {
                String field = key.substring(0, key.length() - 4);
                if (!allowedFields.contains(field)) {
                    continue;
                }
                LocalDateTime from = fromBound ? DateRangeParser.parseStartOfDay(asString(value)) : null;
                LocalDateTime to = toBound ? DateRangeParser.parseEndOfDay(asString(value)) : null;
                spec = spec.and(between(field, from, to));
                continue;
            }

            if (!allowedFields.contains(key)) {
                continue;
            }
            if (value instanceof Collection<?> collection) {
                spec = spec.and(in(key, collection));
            } else if (value instanceof String stringValue) {
                spec = spec.and(like(key, stringValue));
            } else {
                spec = spec.and(equality(key, value));
            }
        }
        return spec;
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }
}
