import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Button, Alert } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxywnagqrdkphovnkzhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eXduYWdxcmRrcGhvdm5remh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NDQ0OTksImV4cCI6MjA3ODIyMDQ5OX0.Fcx5__ocCVm2W4EuF0lzZL6c8_BIJKvYn2LWItHt_s8';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [screen, setScreen] = useState('profile'); // 'profile', 'job', 'result', 'history'
  const [decisions, setDecisions] = useState([]);

  // Profile state
  const [currentSalary, setCurrentSalary] = useState('80000');
  const [priority_salary, setPrioritySalary] = useState('3');
  const [priority_balance, setPriorityBalance] = useState('4');
  const [priority_growth, setPriorityGrowth] = useState('3');
  const [priority_stability, setPriorityStability] = useState('4');
  const [priority_remote, setPriorityRemote] = useState('3');

  // Job offer state
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('45');
  const [fundingStage, setFundingStage] = useState('growth');
  const [teamSize, setTeamSize] = useState('5');
  const [isRemote, setIsRemote] = useState(false);

  const [result, setResult] = useState(null);

  // Load decisions on mount
  useEffect(() => {
    loadDecisions();
  }, []);

  async function loadDecisions() {
    try {
      const { data, error } = await supabase
        .from('job_evaluations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.log('Error loading:', error);
      } else {
        setDecisions(data || []);
      }
    } catch (err) {
      console.log('Error:', err);
    }
  }

  function calculateDecisionScore(profile, job) {
    let score = 0;
    let breakdown = {};

    // SALARY
    const salaryChange = job.baseSalary - profile.currentSalary;
    const salaryPercent = (salaryChange / profile.currentSalary) * 100;
    
    if (salaryPercent >= 15) {
      score += profile.priority_salary * 0.5;
      breakdown.salary = `+${salaryPercent.toFixed(1)}% raise (Weight: ${profile.priority_salary}/5)`;
    } else if (salaryPercent >= 5) {
      score += profile.priority_salary * 0.2;
      breakdown.salary = `+${salaryPercent.toFixed(1)}% raise (Weight: ${profile.priority_salary}/5)`;
    } else if (salaryPercent < 0) {
      score -= profile.priority_salary * 0.3;
      breakdown.salary = `${salaryPercent.toFixed(1)}% cut (Weight: ${profile.priority_salary}/5)`;
    } else {
      breakdown.salary = `No change (Weight: ${profile.priority_salary}/5)`;
    }

    // WORK-LIFE BALANCE
    const hours = job.hoursPerWeek;
    if (hours > 50) {
      score -= profile.priority_balance * 0.4;
      breakdown.balance = `${hours} hrs/week - TOO MUCH (Weight: ${profile.priority_balance}/5)`;
    } else if (hours > 45) {
      score -= profile.priority_balance * 0.1;
      breakdown.balance = `${hours} hrs/week - slightly high (Weight: ${profile.priority_balance}/5)`;
    } else {
      score += profile.priority_balance * 0.3;
      breakdown.balance = `${hours} hrs/week - good (Weight: ${profile.priority_balance}/5)`;
    }

    // COMPANY STABILITY
    const stage = job.fundingStage;
    if (stage === 'seed') {
      score -= profile.priority_stability * 0.5;
      breakdown.stability = `Seed startup - HIGH RISK (Weight: ${profile.priority_stability}/5)`;
    } else if (stage === 'series-a') {
      score -= profile.priority_stability * 0.2;
      breakdown.stability = `Series A - moderate risk (Weight: ${profile.priority_stability}/5)`;
    } else if (stage === 'growth') {
      score += profile.priority_stability * 0.1;
      breakdown.stability = `Growth stage - stable (Weight: ${profile.priority_stability}/5)`;
    } else if (stage === 'public') {
      score += profile.priority_stability * 0.5;
      breakdown.stability = `Public company - very safe (Weight: ${profile.priority_stability}/5)`;
    }

    // GROWTH OPPORTUNITY
    const teamSize = job.teamSize;
    if (teamSize > 10) {
      score += profile.priority_growth * 0.4;
      breakdown.growth = `Large team (${teamSize}) - great mentorship (Weight: ${profile.priority_growth}/5)`;
    } else if (teamSize > 5) {
      score += profile.priority_growth * 0.2;
      breakdown.growth = `Medium team (${teamSize}) - good growth (Weight: ${profile.priority_growth}/5)`;
    } else if (teamSize <= 3) {
      score -= profile.priority_growth * 0.3;
      breakdown.growth = `Small team (${teamSize}) - limited growth (Weight: ${profile.priority_growth}/5)`;
    } else {
      score += profile.priority_growth * 0.1;
      breakdown.growth = `Team size ${teamSize} (Weight: ${profile.priority_growth}/5)`;
    }

    // REMOTE WORK
    if (profile.priority_remote >= 4) {
      if (job.isRemote) {
        score += 3;
        breakdown.remote = `Fully remote - MATCHES YOUR PRIORITY ✅ (Weight: ${profile.priority_remote}/5)`;
      } else {
        score -= 2;
        breakdown.remote = `On-site - CONFLICTS WITH YOUR NEED (Weight: ${profile.priority_remote}/5)`;
      }
    } else {
      breakdown.remote = `Remote not a priority (Weight: ${profile.priority_remote}/5)`;
    }

    // FINAL RECOMMENDATION
    let recommendation = 'UNDECIDED';
    let explanation = '';
    
    if (score >= 7) {
      recommendation = 'TAKE ✅';
      explanation = 'Strong yes. This aligns well with your priorities.';
    } else if (score >= 4) {
      recommendation = 'TAKE ✅';
      explanation = 'Yes. Good overall fit for you.';
    } else if (score >= 0) {
      recommendation = 'NEGOTIATE 🤝';
      explanation = 'Close call. Try negotiating on weak points.';
    } else if (score >= -3) {
      recommendation = 'PROBABLY PASS ⚠️';
      explanation = 'Lean towards no. Better options likely exist.';
    } else {
      recommendation = 'PASS ❌';
      explanation = 'Strong no. This does not fit your priorities.';
    }

    return { score: score.toFixed(1), recommendation, breakdown, explanation };
  }

  async function analyzeOffer() {
    if (!baseSalary || !jobTitle || !company) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const profile = {
      currentSalary: parseInt(currentSalary),
      priority_salary: parseInt(priority_salary),
      priority_balance: parseInt(priority_balance),
      priority_growth: parseInt(priority_growth),
      priority_stability: parseInt(priority_stability),
      priority_remote: parseInt(priority_remote),
    };

    const job = {
      baseSalary: parseInt(baseSalary),
      hoursPerWeek: parseInt(hoursPerWeek),
      fundingStage,
      teamSize: parseInt(teamSize),
      isRemote,
    };

    const analysis = calculateDecisionScore(profile, job);
    setResult({ ...analysis, job, profile });

    // Save to database
    try {
      const { data, error } = await supabase
        .from('job_evaluations')
        .insert([
          {
            base_salary: parseInt(baseSalary),
            estimated_hours: parseInt(hoursPerWeek),
            funding_stage: fundingStage,
            team_size: parseInt(teamSize),
            recommendation: analysis.recommendation,
            recommendation_score: parseFloat(analysis.score),
            user_decision: 'UNDECIDED'
          }
        ]);
      
      if (error) console.log('Save error:', error);
    } catch (err) {
      console.log('Error:', err);
    }

    setScreen('result');
  }

  // PROFILE SCREEN
  if (screen === 'profile') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>CareerMove</Text>
        <Text style={styles.subtitle}>Job Decision Analyzer</Text>

        <Text style={styles.section}>Your Profile</Text>
        <Text style={styles.label}>Current Salary ($):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={currentSalary}
          onChangeText={setCurrentSalary}
          placeholder="e.g., 80000"
        />

        <Text style={styles.label}>Salary Priority (1-5):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={priority_salary} onChangeText={setPrioritySalary} />

        <Text style={styles.label}>Work-Life Balance Priority (1-5):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={priority_balance} onChangeText={setPriorityBalance} />

        <Text style={styles.label}>Career Growth Priority (1-5):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={priority_growth} onChangeText={setPriorityGrowth} />

        <Text style={styles.label}>Stability Priority (1-5):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={priority_stability} onChangeText={setPriorityStability} />

        <Text style={styles.label}>Remote Work Priority (1-5):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={priority_remote} onChangeText={setPriorityRemote} />

        <View style={styles.buttonRow}>
          <Button title="Evaluate Offer" onPress={() => setScreen('job')} color="#4CAF50" />
          {decisions.length > 0 && <Button title="History" onPress={() => setScreen('history')} color="#2196F3" />}
        </View>
      </ScrollView>
    );
  }

  // JOB OFFER SCREEN
  if (screen === 'job') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Job Offer</Text>

        <Text style={styles.label}>Job Title:</Text>
        <TextInput style={styles.input} value={jobTitle} onChangeText={setJobTitle} placeholder="e.g., Senior Engineer" />

        <Text style={styles.label}>Company Name:</Text>
        <TextInput style={styles.input} value={company} onChangeText={setCompany} placeholder="e.g., Google" />

        <Text style={styles.label}>Base Salary ($):</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={baseSalary} onChangeText={setBaseSalary} placeholder="e.g., 95000" />

        <Text style={styles.label}>Hours Per Week:</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={hoursPerWeek} onChangeText={setHoursPerWeek} />

        <Text style={styles.label}>Company Stage:</Text>
        <View style={styles.stagePicker}>
          {['seed', 'series-a', 'growth', 'public'].map(stage => (
            <Button
              key={stage}
              title={stage}
              onPress={() => setFundingStage(stage)}
              color={fundingStage === stage ? '#4CAF50' : '#ccc'}
            />
          ))}
        </View>

        <Text style={styles.label}>Team Size:</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={teamSize} onChangeText={setTeamSize} />

        <View style={styles.remoteRow}>
          <Text style={styles.label}>Fully Remote?</Text>
          <Button
            title={isRemote ? '✓ YES' : '○ NO'}
            onPress={() => setIsRemote(!isRemote)}
            color={isRemote ? '#4CAF50' : '#999'}
          />
        </View>

        <View style={styles.buttonRow}>
          <Button title="Analyze" onPress={analyzeOffer} color="#4CAF50" />
          <Button title="Back" onPress={() => setScreen('profile')} color="#999" />
        </View>
      </ScrollView>
    );
  }

  // RESULT SCREEN
  if (screen === 'result' && result) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Recommendation</Text>

        <Text style={[styles.recommendation, result.recommendation.includes('TAKE') ? styles.take : result.recommendation.includes('PASS') ? styles.pass : styles.negotiate]}>
          {result.recommendation}
        </Text>

        <Text style={styles.score}>Score: {result.score}/10</Text>
        <Text style={styles.explanation}>{result.explanation}</Text>

        <Text style={styles.section}>Analysis Breakdown:</Text>
        {Object.entries(result.breakdown).map(([key, value]) => (
          <View key={key} style={styles.breakdownItem}>
            <Text style={styles.breakdownKey}>{key}:</Text>
            <Text style={styles.breakdownValue}>{value}</Text>
          </View>
        ))}

        <View style={styles.buttonRow}>
          <Button title="Try Another" onPress={() => { setScreen('job'); setJobTitle(''); setCompany(''); setBaseSalary(''); }} color="#4CAF50" />
          <Button title="Back to Profile" onPress={() => setScreen('profile')} color="#999" />
        </View>
      </ScrollView>
    );
  }

  // HISTORY SCREEN
  if (screen === 'history') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Decision History</Text>
        <Text style={styles.subtitle}>{decisions.length} evaluations</Text>

        {decisions.length === 0 ? (
          <Text>No decisions yet.</Text>
        ) : (
          decisions.map((d, i) => (
            <View key={i} style={styles.historyItem}>
              <Text style={styles.historyRec}>{d.recommendation}</Text>
              <Text>${d.base_salary} | {d.estimated_hours}hrs | {d.funding_stage}</Text>
              <Text style={styles.historyScore}>Score: {d.recommendation_score}</Text>
              <Text style={styles.historyDate}>{new Date(d.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}

        <Button title="Back" onPress={() => setScreen('profile')} color="#999" />
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 5,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    fontSize: 14,
  },
  recommendation: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  take: { color: '#4CAF50' },
  pass: { color: '#f44336' },
  negotiate: { color: '#ff9800' },
  score: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  explanation: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  breakdownItem: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 10,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  breakdownKey: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  breakdownValue: {
    color: '#666',
    fontSize: 13,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 20,
  },
  stagePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  remoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  historyItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  historyRec: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  historyScore: {
    fontWeight: 'bold',
    color: '#666',
    marginTop: 5,
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
});