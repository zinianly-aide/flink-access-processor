package com.example.flinkmonitorbackend.service.impl;

import com.example.flinkmonitorbackend.entity.Organization;
import com.example.flinkmonitorbackend.mapper.OrganizationMapper;
import com.example.flinkmonitorbackend.service.OrganizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class OrganizationServiceImpl implements OrganizationService {

    @Autowired
    private OrganizationMapper organizationMapper;

    @Override
    public List<Organization> findAll() {
        return organizationMapper.findAll();
    }

    @Override
    public List<Organization> findActiveOrganizations() {
        return organizationMapper.findActiveOrganizations();
    }

    @Override
    public Organization findById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Organization ID cannot be null");
        }
        Organization organization = organizationMapper.findById(id);
        if (organization == null) {
            throw new IllegalArgumentException("Organization not found: " + id);
        }
        return organization;
    }

    @Override
    public List<Map<String, Object>> getOrgExceptionalHoursSummary() {
        return organizationMapper.getOrgExceptionalHoursSummary();
    }
}