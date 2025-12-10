package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.Organization;
import com.example.flinkmonitorbackend.service.OrganizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/organizations")
@CrossOrigin
public class OrganizationController {

    @Autowired
    private OrganizationService organizationService;

    @GetMapping
    public List<Organization> getAllOrganizations() {
        return organizationService.findAll();
    }

    @GetMapping("/active")
    public List<Organization> getActiveOrganizations() {
        return organizationService.findActiveOrganizations();
    }

    @GetMapping("/summary")
    public List<Map<String, Object>> getOrgExceptionalHoursSummary() {
        return organizationService.getOrgExceptionalHoursSummary();
    }
}