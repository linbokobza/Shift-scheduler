import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Plus, Trash2, Save } from 'lucide-react';
import { Card } from '../../ui/Card';

interface PersonalConstraint {
  id: string;
  text: string;
}

interface ConstraintsTabMobileProps {
  userName: string;
}

export const ConstraintsTabMobile: React.FC<ConstraintsTabMobileProps> = ({ userName }) => {
  const [personalConstraints, setPersonalConstraints] = useState<PersonalConstraint[]>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('employee-personal-constraints');
    return saved ? JSON.parse(saved) : [];
  });
  const [newConstraintText, setNewConstraintText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // This will show employee-specific constraints and rules
  const constraints = [
    {
      id: 1,
      title: 'משמרות סוף שבוע',
      description: 'לא ניתן לבחור משמרות ערב ולילה ביום שישי, וכל המשמרות בשבת',
      type: 'rule' as const,
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />
    },
    {
      id: 2,
      title: 'מועד הגשה',
      description: 'יש להגיש זמינות עד יום שלישי בשעה 12:00, שבועיים לפני השבוע המבוקש',
      type: 'rule' as const,
      icon: <AlertTriangle className="w-5 h-5 text-blue-600" />
    },
    {
      id: 3,
      title: 'ימי חופשה',
      description: 'ימי חופשה ומחלה מסומנים אוטומטית כלא זמין בכל המשמרות',
      type: 'info' as const,
      icon: <CheckCircle className="w-5 h-5 text-green-600" />
    },
    {
      id: 4,
      title: 'חגים',
      description: 'בימי חג מסוימים, רק משמרות ספציפיות זמינות לבחירה',
      type: 'info' as const,
      icon: <CheckCircle className="w-5 h-5 text-purple-600" />
    }
  ];

  const handleAddConstraint = () => {
    if (newConstraintText.trim()) {
      const newConstraint: PersonalConstraint = {
        id: Date.now().toString(),
        text: newConstraintText.trim()
      };
      setPersonalConstraints([...personalConstraints, newConstraint]);
      setNewConstraintText('');
      setHasChanges(true);
    }
  };

  const handleRemoveConstraint = (id: string) => {
    setPersonalConstraints(personalConstraints.filter(c => c.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('employee-personal-constraints', JSON.stringify(personalConstraints));
      setHasChanges(false);
      // Show success feedback
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Failed to save constraints:', error);
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">אילוצים וכללים</h2>
        <p className="text-sm text-gray-600">
          כללי המערכת וההגבלות עבור הגשת זמינות
        </p>
      </div>

      <div className="space-y-3">
        {constraints.map((constraint) => (
          <Card key={constraint.id} padding="md" className="border-r-4 border-r-blue-500">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {constraint.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {constraint.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {constraint.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Personal constraints */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">אילוצים אישיים</h3>

        {/* Add new constraint */}
        <Card padding="md" className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newConstraintText}
              onChange={(e) => setNewConstraintText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddConstraint()}
              placeholder="הוסף אילוץ אישי (למשל: לא זמין בימי שלישי)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              dir="rtl"
            />
            <button
              onClick={handleAddConstraint}
              disabled={!newConstraintText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="הוסף אילוץ"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </Card>

        {/* List of personal constraints */}
        {personalConstraints.length > 0 ? (
          <div className="space-y-2">
            {personalConstraints.map((constraint) => (
              <Card key={constraint.id} padding="md" className="border-r-4 border-r-green-500">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{constraint.text}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveConstraint(constraint.id)}
                    className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors p-2 min-h-[44px] min-w-[44px]"
                    aria-label="מחק אילוץ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card padding="md" className="bg-gray-50">
            <div className="text-center py-6">
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">אין אילוצים אישיים מוגדרים</p>
              <p className="text-gray-500 text-xs mt-1">
                הוסף אילוצים אישיים כדי להודיע למנהל על העדפות שלך
              </p>
            </div>
          </Card>
        )}

        {/* Save button - appears when there are changes */}
        {hasChanges && (
          <div className="fixed bottom-20 left-4 right-4 z-10">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 shadow-lg min-h-[44px]"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>שומר...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>שמור אילוצים אישיים</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
