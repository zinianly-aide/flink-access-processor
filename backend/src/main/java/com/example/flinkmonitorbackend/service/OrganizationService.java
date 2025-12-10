package com.example.flinkmonitorbackend.service;

import com.example.flinkmonitorbackend.entity.Organization;
import java.util.List;
import java.util.Map;

public interface OrganizationService {
    List<Organization> findAll();
    List<Organization> findActiveOrganizations();
    Organization findById(Long id);
    List<Map<String, Object>> getOrgExceptionalHoursSummary();
}