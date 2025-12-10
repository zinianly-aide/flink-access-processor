package com.example.flinkmonitorbackend.controller;

import com.example.flinkmonitorbackend.entity.AbsenceRecord;
import com.example.flinkmonitorbackend.service.AbsenceRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/absence-records")
@CrossOrigin(origins = "*")
public class AbsenceRecordController {
    @Autowired
    private AbsenceRecordService absenceRecordService;

    @GetMapping
    public List<AbsenceRecord> findAll() {
        return absenceRecordService.findAll();
    }

    @PostMapping("/{recordId}/reason")
    public AbsenceRecord submitReason(@PathVariable Long recordId, @RequestBody Map<String, String> reasonData) {
        AbsenceRecord record = absenceRecordService.findById(recordId);
        if (record != null) {
            record.setReason(reasonData.get("reason"));
            record.setImageUrl(reasonData.get("image_url"));
            record.setPreventiveMeasures(reasonData.get("preventive_measures"));
            absenceRecordService.update(record);
        }
        return record;
    }

    @PutMapping("/{recordId}/flag")
    public AbsenceRecord updateFlag(@PathVariable Long recordId, @RequestBody Map<String, Boolean> flagData) {
        AbsenceRecord record = absenceRecordService.findById(recordId);
        if (record != null) {
            record.setFlag(flagData.get("flag"));
            absenceRecordService.update(record);
        }
        return record;
    }
}