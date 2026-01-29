// =====================================================
// 개인정보 처리방침 페이지
// =====================================================

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="ml-2 text-lg font-semibold text-gray-900">개인정보 처리방침</h1>
        </div>
      </header>

      {/* 내용 */}
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제1조 (목적)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              본 개인정보 처리방침은 출퇴근 관리 시스템(이하 "서비스")이 수집하는 개인정보의 항목, 
              수집 및 이용 목적, 보유 및 이용 기간, 제3자 제공에 관한 사항을 규정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제2조 (수집하는 개인정보)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              서비스는 다음과 같은 개인정보를 수집합니다:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>필수 항목: 이름, 사번, 부서, 직급, 연락처</li>
              <li>선택 항목: 이메일, 프로필 사진</li>
              <li>자동 수집 항목: 출퇴근 시간, 위치 정보, 접속 기록</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제3조 (개인정보의 이용 목적)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              수집된 개인정보는 다음의 목적으로 이용됩니다:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>출퇴근 기록 및 근태 관리</li>
              <li>급여 계산 및 지급</li>
              <li>휴가 관리</li>
              <li>근로기준법 준수 여부 확인</li>
              <li>서비스 이용에 관한 통지 및 안내</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제4조 (개인정보의 보유 및 이용 기간)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              개인정보는 <strong>재직 기간 동안</strong> 보유하며, 퇴사 시 지체 없이 파기합니다.
              단, 관련 법령에 따라 보존할 필요가 있는 경우 퇴사 후에도 해당 기간 동안 보관합니다.
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc mt-2">
              <li>근로계약 관련 기록: 퇴사 후 3년</li>
              <li>임금 및 급여 관련 기록: 퇴사 후 3년</li>
              <li>근로시간 관련 기록: 퇴사 후 3년</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제5조 (개인정보의 제3자 제공)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 
              다만, 다음의 경우에는 예외로 합니다:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의한 경우</li>
              <li>수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요청이 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제6조 (개인정보의 안전성 확보 조치)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>개인정보 암호화</li>
              <li>해킹 등에 대비한 기술적 대책</li>
              <li>개인정보 접근 제한</li>
              <li>개인정보 처리 직원의 최소화 및 교육</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제7조 (이용자의 권리와 그 행사 방법)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 
              개인정보의 처리 정지를 요청할 수 있습니다. 
              관련 요청은 고객센터를 통해 접수할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제8조 (개인정보 보호책임자)</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">담당부서: 인사팀</p>
              <p className="text-sm text-gray-600">연락처: support@company.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제9조 (개인정보 처리방침의 변경)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              이 개인정보 처리방침은 2024년 1월 1일부터 적용됩니다. 
              법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <p className="text-xs text-gray-400 text-center pt-4">
            시행일: 2024년 1월 1일
          </p>
        </div>
      </div>
    </div>
  );
}
