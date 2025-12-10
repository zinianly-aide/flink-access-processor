package com.example.flinkmonitorbackend.mapper;

import com.example.flinkmonitorbackend.entity.Organization;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;
import java.util.Map;

@Mapper
public interface OrganizationMapper {
    List<Organization> findAll();
    List<Organization> findActiveOrganizations();
    Organization findById(Long id);
    List<Map<String, Object>> getOrgExceptionalHoursSummary();
}